// src/services/polygon/webSocketManager.ts
import { POLYGON_API_KEY } from '@env';
import EventEmitter from 'eventemitter3';
import { websocketClient } from '@polygon.io/client-js';
import { ConnectionState, Market, StockUpdateEvent, OptionUpdateEvent } from './types';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { SUPABASE_URL } from '@env';
import { supabase } from '@/initSupabase';

// Subscription throttling configuration
interface ThrottleConfig {
  interval: number;      // Interval in milliseconds
  maxUpdatesPerInterval: number;
  enabled: boolean;
}

// Subscription types and priorities
enum SubscriptionPriority {
  CRITICAL = 0,          // User is actively viewing (real-time)
  HIGH = 1,              // In user's portfolio (every 5s)
  MEDIUM = 2,            // In watchlist (every 15s)
  LOW = 3,               // Options chains, background data (every 30s)
  PAUSED = 4             // App in background or unused symbols (paused)
}

interface Subscription {
  symbol: string;
  priority: SubscriptionPriority;
  lastUpdated: number;
  market: Market;
}

class PolygonWebSocketManager {
  private stocksWS: any = null;
  private optionsWS: any = null;
  private eventEmitter = new EventEmitter();
  
  // Subscription management
  private subscriptions: Map<string, Subscription> = new Map();
  
  // Connection states
  private connectionStates: Record<Market, ConnectionState> = {
    [Market.STOCKS]: ConnectionState.DISCONNECTED,
    [Market.OPTIONS]: ConnectionState.DISCONNECTED,
    [Market.FOREX]: ConnectionState.DISCONNECTED,
    [Market.CRYPTO]: ConnectionState.DISCONNECTED,
  };
  
  // Reconnection management
  private reconnectAttempts: Record<Market, number> = {
    [Market.STOCKS]: 0,
    [Market.OPTIONS]: 0,
    [Market.FOREX]: 0,
    [Market.CRYPTO]: 0,
  };
  private reconnectTimers: Record<Market, any> = {
    [Market.STOCKS]: null,
    [Market.OPTIONS]: null,
    [Market.FOREX]: null,
    [Market.CRYPTO]: null,
  };
  private heartbeatTimers: Record<Market, any> = {
    [Market.STOCKS]: null,
    [Market.OPTIONS]: null,
    [Market.FOREX]: null,
    [Market.CRYPTO]: null,
  };
  
  // Data caches
  private stockDataCache: Record<string, { 
    price: number;
    timestamp: number;
    priority: SubscriptionPriority;
  }> = {};
  
  private optionDataCache: Record<string, { 
    price: number;
    timestamp: number;
    priority: SubscriptionPriority;
  }> = {};
  
  // Throttling configuration
  private throttleConfigs: Record<SubscriptionPriority, ThrottleConfig> = {
    [SubscriptionPriority.CRITICAL]: {
      interval: 1000,              // 1 second
      maxUpdatesPerInterval: 1000, // No real limit for critical
      enabled: false               // No throttling for critical
    },
    [SubscriptionPriority.HIGH]: {
      interval: 5000,              // 5 seconds
      maxUpdatesPerInterval: 100,  // Up to 100 updates per 5 seconds
      enabled: true
    },
    [SubscriptionPriority.MEDIUM]: {
      interval: 15000,             // 15 seconds
      maxUpdatesPerInterval: 50,   // Up to 50 updates per 15 seconds
      enabled: true
    },
    [SubscriptionPriority.LOW]: {
      interval: 30000,             // 30 seconds
      maxUpdatesPerInterval: 25,   // Up to 25 updates per 30 seconds
      enabled: true
    },
    [SubscriptionPriority.PAUSED]: {
      interval: 300000,            // 5 minutes
      maxUpdatesPerInterval: 0,    // No updates when paused
      enabled: true
    }
  };
  
  // Throttling counters and timers
  private updateCounters: Record<SubscriptionPriority, number> = {
    [SubscriptionPriority.CRITICAL]: 0,
    [SubscriptionPriority.HIGH]: 0,
    [SubscriptionPriority.MEDIUM]: 0,
    [SubscriptionPriority.LOW]: 0,
    [SubscriptionPriority.PAUSED]: 0
  };
  
  private throttleTimers: Record<SubscriptionPriority, NodeJS.Timeout | null> = {
    [SubscriptionPriority.CRITICAL]: null,
    [SubscriptionPriority.HIGH]: null,
    [SubscriptionPriority.MEDIUM]: null,
    [SubscriptionPriority.LOW]: null,
    [SubscriptionPriority.PAUSED]: null
  };
  
  // Constants
  private maxReconnectAttempts: number = 5;
  private reconnectInterval: number = 5000;
  private forceDisconnectForBackground: boolean = false; // Set to true to disconnect when app is in background
  
  // Connection batch window (ms) - Time to wait for additional subscription changes before connecting
  private connectionBatchWindow: number = 500;
  private pendingConnectionRequests: Record<Market, NodeJS.Timeout | null> = {
    [Market.STOCKS]: null,
    [Market.OPTIONS]: null,
    [Market.FOREX]: null,
    [Market.CRYPTO]: null,
  };
  
  constructor() {
    // Setup throttle timers for each priority level
    Object.keys(this.throttleConfigs).forEach(priorityKey => {
      const priority = Number(priorityKey) as SubscriptionPriority;
      if (this.throttleConfigs[priority].enabled) {
        this.resetThrottleTimer(priority);
      }
    });
    
    // Monitor app state changes on mobile
    if (Platform.OS !== 'web') {
      AppState.addEventListener('change', this.handleAppStateChange);
    } else {
      // For web, monitor document visibility
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
      }
    }
  }
  
  /**
   * Reset throttle timer for a specific priority level
   */
  private resetThrottleTimer(priority: SubscriptionPriority): void {
    if (this.throttleTimers[priority]) {
      clearInterval(this.throttleTimers[priority]!);
    }
    
    this.updateCounters[priority] = 0;
    
    this.throttleTimers[priority] = setInterval(() => {
      this.updateCounters[priority] = 0;
    }, this.throttleConfigs[priority].interval);
  }
  
  /**
   * Check if an update should be throttled based on priority
   */
  private shouldThrottleUpdate(priority: SubscriptionPriority): boolean {
    const config = this.throttleConfigs[priority];
    
    if (!config.enabled) return false;
    
    return this.updateCounters[priority] >= config.maxUpdatesPerInterval;
  }
  
  /**
   * Track an update for throttling purposes
   */
  private trackUpdate(priority: SubscriptionPriority): void {
    if (this.throttleConfigs[priority].enabled) {
      this.updateCounters[priority]++;
    }
  }
  
  /**
   * Handle app state changes for React Native
   */
  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    if (nextAppState === 'active') {
      // App has come to the foreground - reconnect and resume updates
      console.log('App active, resuming WebSocket connections');
      this.resumeAllSubscriptions();
    } else if (nextAppState === 'background') {
      // App has gone to the background
      console.log('App in background, pausing WebSocket updates');
      
      if (this.forceDisconnectForBackground) {
        // Option 1: Disconnect completely
        this.disconnect(Market.STOCKS);
        this.disconnect(Market.OPTIONS);
      } else {
        // Option 2: Just pause the updates (better for quick resumption)
        this.pauseAllSubscriptions();
      }
    }
  };
  
  /**
   * Handle document visibility changes for web
   */
  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      // Page is visible again, reconnect if disconnected and resume updates
      console.log('Page visible, resuming WebSocket connections');
      this.resumeAllSubscriptions();
    } else {
      // Page is hidden
      console.log('Page hidden, pausing WebSocket updates');
      
      if (this.forceDisconnectForBackground) {
        // Option 1: Disconnect completely
        this.disconnect(Market.STOCKS);
        this.disconnect(Market.OPTIONS);
      } else {
        // Option 2: Just pause the updates (better for quick resumption)
        this.pauseAllSubscriptions();
      }
    }
  };
  
  /**
   * Pause all subscriptions (when app goes to background)
   */
  private pauseAllSubscriptions(): void {
    // Update all subscriptions to PAUSED priority
    for (const [symbol, subscription] of this.subscriptions.entries()) {
      const oldPriority = subscription.priority;
      
      // Only pause if not already paused
      if (oldPriority !== SubscriptionPriority.PAUSED) {
        // Store the original priority in the cache so we can restore it later
        if (subscription.market === Market.STOCKS && this.stockDataCache[symbol]) {
          this.stockDataCache[symbol].priority = oldPriority;
        } else if (subscription.market === Market.OPTIONS && this.optionDataCache[symbol]) {
          this.optionDataCache[symbol].priority = oldPriority;
        }
        
        // Update the subscription to paused
        subscription.priority = SubscriptionPriority.PAUSED;
      }
    }
  }
  
  /**
   * Resume all subscriptions (when app comes to foreground)
   */
  private resumeAllSubscriptions(): void {
    // First, ensure connections are established
    const hasStockSubscriptions = [...this.subscriptions.values()].some(
      sub => sub.market === Market.STOCKS
    );
    
    const hasOptionSubscriptions = [...this.subscriptions.values()].some(
      sub => sub.market === Market.OPTIONS
    );
    
    // Re-establish connections if needed
    if (hasStockSubscriptions && 
        this.connectionStates[Market.STOCKS] === ConnectionState.DISCONNECTED) {
      this.scheduleBatchedConnection(Market.STOCKS);
    }
    
    if (hasOptionSubscriptions && 
        this.connectionStates[Market.OPTIONS] === ConnectionState.DISCONNECTED) {
      this.scheduleBatchedConnection(Market.OPTIONS);
    }
    
    // Restore priorities from cache
    for (const [symbol, subscription] of this.subscriptions.entries()) {
      if (subscription.priority === SubscriptionPriority.PAUSED) {
        // Restore from cache if available
        if (subscription.market === Market.STOCKS && this.stockDataCache[symbol]) {
          const cachedPriority = this.stockDataCache[symbol].priority;
          subscription.priority = cachedPriority !== SubscriptionPriority.PAUSED ? 
            cachedPriority : SubscriptionPriority.MEDIUM; // Default to MEDIUM if no cached priority
        } else if (subscription.market === Market.OPTIONS && this.optionDataCache[symbol]) {
          const cachedPriority = this.optionDataCache[symbol].priority;
          subscription.priority = cachedPriority !== SubscriptionPriority.PAUSED ? 
            cachedPriority : SubscriptionPriority.LOW; // Default to LOW if no cached priority
        } else {
          // If no cache, default based on market
          subscription.priority = subscription.market === Market.STOCKS ?
            SubscriptionPriority.MEDIUM : SubscriptionPriority.LOW;
        }
      }
    }
  }
  
  /**
   * Schedule a batched connection to avoid rapid connect/disconnect cycles
   */
  private scheduleBatchedConnection(market: Market): void {
    // Cancel any existing timer
    if (this.pendingConnectionRequests[market]) {
      clearTimeout(this.pendingConnectionRequests[market]!);
    }
    
    // Schedule a new connection after the batch window
    this.pendingConnectionRequests[market] = setTimeout(() => {
      this.connect(market);
      this.pendingConnectionRequests[market] = null;
    }, this.connectionBatchWindow);
  }
  
  /**
   * Connect to a specific market's WebSocket
   */
  public connect(market: Market = Market.STOCKS): void {
    if (market === Market.STOCKS) {
      this.connectStocks();
    } else if (market === Market.OPTIONS) {
      this.connectOptions();
    }
  }
  
  /**
   * Connect to the Stocks WebSocket
   */
  private async connectStocks(): Promise<void> {
    if (this.connectionStates[Market.STOCKS] !== ConnectionState.DISCONNECTED) {
      return;
    }
    
    this.connectionStates[Market.STOCKS] = ConnectionState.CONNECTING;
    this.emitConnectionStateChange(Market.STOCKS);
    
    try {
      this.stocksWS = websocketClient(POLYGON_API_KEY).stocks();
      
      // Setup event handlers
      this.stocksWS.onopen = () => this.handleOpen(Market.STOCKS);
      this.stocksWS.onclose = () => this.handleClose(Market.STOCKS);
      this.stocksWS.onerror = (error: any) => this.handleError(error, Market.STOCKS);
      this.stocksWS.onmessage = (event: MessageEvent) => this.handleStocksMessage(event);
      
      console.log('Connecting to Polygon.io Stocks WebSocket...');
    } catch (error) {
      console.error('Error creating Stocks WebSocket connection:', error);
      this.connectionStates[Market.STOCKS] = ConnectionState.ERROR;
      this.emitConnectionStateChange(Market.STOCKS);
      this.scheduleReconnect(Market.STOCKS);
    }
  }
  
  /**
   * Connect to the Options WebSocket
   */
  private async connectOptions(): Promise<void> {
    if (this.connectionStates[Market.OPTIONS] !== ConnectionState.DISCONNECTED) {
      return;
    }
    
    this.connectionStates[Market.OPTIONS] = ConnectionState.CONNECTING;
    this.emitConnectionStateChange(Market.OPTIONS);
    
    try {
      this.optionsWS = websocketClient(POLYGON_API_KEY).options();
      
      // Setup event handlers
      this.optionsWS.onopen = () => this.handleOpen(Market.OPTIONS);
      this.optionsWS.onclose = () => this.handleClose(Market.OPTIONS);
      this.optionsWS.onerror = (error: any) => this.handleError(error, Market.OPTIONS);
      this.optionsWS.onmessage = (event: MessageEvent) => this.handleOptionsMessage(event);
      
      console.log('Connecting to Polygon.io Options WebSocket...');
    } catch (error) {
      console.error('Error creating Options WebSocket connection:', error);
      this.connectionStates[Market.OPTIONS] = ConnectionState.ERROR;
      this.emitConnectionStateChange(Market.OPTIONS);
      this.scheduleReconnect(Market.OPTIONS);
    }
  }
  
  /**
   * Disconnect from WebSocket
   */
  public disconnect(market: Market = Market.STOCKS): void {
    if (market === Market.STOCKS) {
      this.disconnectStocks();
    } else if (market === Market.OPTIONS) {
      this.disconnectOptions();
    }
  }
  
  /**
   * Disconnect from Stocks WebSocket
   */
  private disconnectStocks(): void {
    this.clearTimers(Market.STOCKS);
    
    if (this.stocksWS) {
      try {
        // Only unsubscribe if connected
        if (this.connectionStates[Market.STOCKS] === ConnectionState.CONNECTED) {
          const stockSymbols = [...this.subscriptions.values()]
            .filter(sub => sub.market === Market.STOCKS)
            .map(sub => `Q.${sub.symbol}`);
          
          if (stockSymbols.length > 0) {
            try {
              this.stocksWS.send({ action: 'unsubscribe', params: stockSymbols.join(',') });
            } catch (e) {
              console.error('Error unsubscribing from stock symbols:', e);
            }
          }
        }
        
        // Close the connection
        this.stocksWS.close();
        this.stocksWS = null;
      } catch (error) {
        console.error('Error disconnecting from Stocks WebSocket:', error);
      }
    }
    
    this.connectionStates[Market.STOCKS] = ConnectionState.DISCONNECTED;
    this.emitConnectionStateChange(Market.STOCKS);
  }
  
  /**
   * Disconnect from Options WebSocket
   */
  private disconnectOptions(): void {
    this.clearTimers(Market.OPTIONS);
    
    if (this.optionsWS) {
      try {
        // Only unsubscribe if connected
        if (this.connectionStates[Market.OPTIONS] === ConnectionState.CONNECTED) {
          const optionSymbols = [...this.subscriptions.values()]
            .filter(sub => sub.market === Market.OPTIONS)
            .map(sub => `T.${sub.symbol}`);
          
          if (optionSymbols.length > 0) {
            try {
              this.optionsWS.send({ action: 'unsubscribe', params: optionSymbols.join(',') });
            } catch (e) {
              console.error('Error unsubscribing from option symbols:', e);
            }
          }
        }
        
        // Close the connection
        this.optionsWS.close();
        this.optionsWS = null;
      } catch (error) {
        console.error('Error disconnecting from Options WebSocket:', error);
      }
    }
    
    this.connectionStates[Market.OPTIONS] = ConnectionState.DISCONNECTED;
    this.emitConnectionStateChange(Market.OPTIONS);
  }
  
  /**
   * Subscribe to a stock with specified priority
   */
  public subscribeStock(
    symbol: string, 
    priority: SubscriptionPriority = SubscriptionPriority.MEDIUM
  ): void {
    const symbolUpper = symbol.toUpperCase();
    const key = symbolUpper;
    
    // Check if already subscribed
    const existingSub = this.subscriptions.get(key);
    if (existingSub) {
      // Update priority if higher priority requested
      if (priority < existingSub.priority) {
        existingSub.priority = priority;
        
        // Update cache priority as well
        if (this.stockDataCache[symbolUpper]) {
          this.stockDataCache[symbolUpper].priority = priority;
        }
        
        console.log(`Updated priority for ${symbolUpper} to ${priority}`);
      }
      return;
    }
    
    // Add to subscriptions
    this.subscriptions.set(key, {
      symbol: symbolUpper,
      priority,
      lastUpdated: Date.now(),
      market: Market.STOCKS
    });
    
    // Initialize cache entry
    if (!this.stockDataCache[symbolUpper]) {
      this.stockDataCache[symbolUpper] = {
        price: 0,
        timestamp: 0,
        priority
      };
    } else {
      this.stockDataCache[symbolUpper].priority = priority;
    }
    
    // If connected, send subscription
    if (this.connectionStates[Market.STOCKS] === ConnectionState.CONNECTED && this.stocksWS) {
      try {
        const channel = `Q.${symbolUpper}`;
        this.stocksWS.send({ action: 'subscribe', params: channel });
        console.log(`Subscribed to stock: ${symbolUpper} with priority ${priority}`);
      } catch (error) {
        console.error(`Error subscribing to stock ${symbolUpper}:`, error);
      }
    } else if (this.connectionStates[Market.STOCKS] === ConnectionState.DISCONNECTED) {
      // Connect if not already connected, using batched connection
      this.scheduleBatchedConnection(Market.STOCKS);
    }
  }
  
  /**
   * Unsubscribe from stock updates
   */
  public unsubscribeStock(symbol: string): void {
    const symbolUpper = symbol.toUpperCase();
    const key = symbolUpper;
    
    // Remove from subscriptions
    this.subscriptions.delete(key);
    
    // If connected, send unsubscription
    if (this.connectionStates[Market.STOCKS] === ConnectionState.CONNECTED && this.stocksWS) {
      try {
        const channel = `Q.${symbolUpper}`;
        this.stocksWS.send({ action: 'unsubscribe', params: channel });
        console.log(`Unsubscribed from stock: ${symbolUpper}`);
      } catch (error) {
        console.error(`Error unsubscribing from stock ${symbolUpper}:`, error);
      }
    }
  }
  
  /**
   * Subscribe to an option with specified priority
   */
  public subscribeOption(
    optionSymbol: string, 
    priority: SubscriptionPriority = SubscriptionPriority.LOW
  ): void {
    // For options, we need to make sure it has the O: prefix
    let formattedSymbol = optionSymbol.toUpperCase();
    if (!formattedSymbol.startsWith('O:')) {
      formattedSymbol = `O:${formattedSymbol}`;
    }
    
    const key = formattedSymbol;
    
    // Check if already subscribed
    const existingSub = this.subscriptions.get(key);
    if (existingSub) {
      // Update priority if higher priority requested
      if (priority < existingSub.priority) {
        existingSub.priority = priority;
        
        // Update cache priority as well
        if (this.optionDataCache[formattedSymbol]) {
          this.optionDataCache[formattedSymbol].priority = priority;
        }
        
        console.log(`Updated priority for ${formattedSymbol} to ${priority}`);
      }
      return;
    }
    
    // Add to subscriptions
    this.subscriptions.set(key, {
      symbol: formattedSymbol,
      priority,
      lastUpdated: Date.now(),
      market: Market.OPTIONS
    });
    
    // Initialize cache entry
    if (!this.optionDataCache[formattedSymbol]) {
      this.optionDataCache[formattedSymbol] = {
        price: 0,
        timestamp: 0,
        priority
      };
    } else {
      this.optionDataCache[formattedSymbol].priority = priority;
    }
    
    // If connected, send subscription
    if (this.connectionStates[Market.OPTIONS] === ConnectionState.CONNECTED && this.optionsWS) {
      try {
        const channel = `T.${formattedSymbol}`;
        this.optionsWS.send({ action: 'subscribe', params: channel });
        console.log(`Subscribed to option: ${formattedSymbol} with priority ${priority}`);
      } catch (error) {
        console.error(`Error subscribing to option ${formattedSymbol}:`, error);
      }
    } else if (this.connectionStates[Market.OPTIONS] === ConnectionState.DISCONNECTED) {
      // Connect if not already connected
      this.scheduleBatchedConnection(Market.OPTIONS);
    }
  }
  
  /**
   * Unsubscribe from option updates
   */
  public unsubscribeOption(optionSymbol: string): void {
    // For options, we need to make sure it has the O: prefix
    let formattedSymbol = optionSymbol.toUpperCase();
    if (!formattedSymbol.startsWith('O:')) {
      formattedSymbol = `O:${formattedSymbol}`;
    }
    
    const key = formattedSymbol;
    
    // Remove from subscriptions
    this.subscriptions.delete(key);
    
    // If connected, send unsubscription
    if (this.connectionStates[Market.OPTIONS] === ConnectionState.CONNECTED && this.optionsWS) {
      try {
        const channel = `T.${formattedSymbol}`;
        this.optionsWS.send({ action: 'unsubscribe', params: channel });
        console.log(`Unsubscribed from option: ${formattedSymbol}`);
      } catch (error) {
        console.error(`Error unsubscribing from option ${formattedSymbol}:`, error);
      }
    }
  }
  
  /**
   * Update subscription priority
   */
  public updatePriority(symbol: string, priority: SubscriptionPriority, market: Market = Market.STOCKS): void {
    let formattedSymbol = symbol.toUpperCase();
    
    // Handle option symbol format
    if (market === Market.OPTIONS && !formattedSymbol.startsWith('O:')) {
      formattedSymbol = `O:${formattedSymbol}`;
    }
    
    const key = formattedSymbol;
    const subscription = this.subscriptions.get(key);
    
    if (subscription) {
      subscription.priority = priority;
      
      // Update cache
      if (market === Market.STOCKS && this.stockDataCache[formattedSymbol]) {
        this.stockDataCache[formattedSymbol].priority = priority;
      } else if (market === Market.OPTIONS && this.optionDataCache[formattedSymbol]) {
        this.optionDataCache[formattedSymbol].priority = priority;
      }
      
      console.log(`Updated priority for ${formattedSymbol} to ${priority}`);
    }
  }
  
  /**
   * Subscribe to stock updates (legacy method for backward compatibility)
   */
  public subscribe(symbol: string, priority: SubscriptionPriority = SubscriptionPriority.MEDIUM): void {
    this.subscribeStock(symbol, priority);
  }
  
  /**
   * Unsubscribe from stock updates (legacy method for backward compatibility)
   */
  public unsubscribe(symbol: string): void {
    this.unsubscribeStock(symbol);
  }
  
  /**
   * Add event listener
   */
  public on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }
  
  /**
   * Remove event listener
   */
  public off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }
  
  /**
   * Public methods to access the stockDataCache
   */
  public getStockData(): Record<string, { price: number; timestamp: number }> {
    // Strip priority from returned data
    const result: Record<string, { price: number; timestamp: number }> = {};
    
    for (const [symbol, data] of Object.entries(this.stockDataCache)) {
      result[symbol] = {
        price: data.price,
        timestamp: data.timestamp
      };
    }
    
    return result;
  }
  
  /**
   * Get stock price
   */
  public getStockPrice(symbol: string): number | null {
    const symbolUpper = symbol.toUpperCase();
    return this.stockDataCache[symbolUpper]?.price || null;
  }
  
  /**
   * Public methods to access the optionDataCache
   */
  public getOptionData(): Record<string, { price: number; timestamp: number }> {
    // Strip priority from returned data
    const result: Record<string, { price: number; timestamp: number }> = {};
    
    for (const [symbol, data] of Object.entries(this.optionDataCache)) {
      result[symbol] = {
        price: data.price,
        timestamp: data.timestamp
      };
    }
    
    return result;
  }
  
  /**
   * Get option price
   */
  public getOptionPrice(symbol: string): number | null {
    // For options, we need to make sure it has the O: prefix
    let formattedSymbol = symbol.toUpperCase();
    if (!formattedSymbol.startsWith('O:')) {
      formattedSymbol = `O:${formattedSymbol}`;
    }
    
    return this.optionDataCache[formattedSymbol]?.price || null;
  }
  
  /**
   * Get current connection state for a market
   */
  public getConnectionState(market: Market = Market.STOCKS): ConnectionState {
    return this.connectionStates[market];
  }
  
  /**
   * Get list of current subscriptions
   */
  public getSubscriptions(market: Market = Market.STOCKS): string[] {
    return [...this.subscriptions.values()]
      .filter(sub => sub.market === market)
      .map(sub => sub.symbol);
  }
  
  /**
   * Handle WebSocket open event for a market
   */
  private handleOpen = (market: Market): void => {
    if (market === Market.STOCKS) {
      console.log('Polygon Stocks WebSocket connected');
      this.connectionStates[Market.STOCKS] = ConnectionState.CONNECTED;
      this.emitConnectionStateChange(Market.STOCKS);
      this.reconnectAttempts[Market.STOCKS] = 0;
      
      // Send subscriptions for all stocks
      this.sendStockSubscriptions();
      
      // Start heartbeat
      this.startHeartbeat(Market.STOCKS);
    } else if (market === Market.OPTIONS) {
      console.log('Polygon Options WebSocket connected');
      this.connectionStates[Market.OPTIONS] = ConnectionState.CONNECTED;
      this.emitConnectionStateChange(Market.OPTIONS);
      this.reconnectAttempts[Market.OPTIONS] = 0;
      
      // Send subscriptions for all options
      this.sendOptionSubscriptions();
      
      // Start heartbeat
      this.startHeartbeat(Market.OPTIONS);
    }
  };
  
  /**
   * Handle WebSocket messages for stocks
   */
  private handleStocksMessage = (event: MessageEvent): void => {
    try {
      // The data should be an array of messages
      const data = JSON.parse(event.data);
      
      // Handle array of messages or single message
      const messages = Array.isArray(data) ? data : [data];
      
      for (const message of messages) {
        // Handle different message types
        if (message.ev === 'Q') {
          // Quote event
          const symbol = message.sym;
          const price = message.p; // Use bid price
          const timestamp = message.t;
          
          // Get subscription for throttling
          const subscription = this.subscriptions.get(symbol);
          
          // Skip if no subscription (shouldn't happen normally)
          if (!subscription) continue;
          
          // Check if we should throttle the update based on priority
          if (this.shouldThrottleUpdate(subscription.priority)) {
            continue;
          }
          
          // Track the update for throttling
          this.trackUpdate(subscription.priority);
          
          // Update internal cache
          this.stockDataCache[symbol] = {
            price,
            timestamp,
            priority: subscription.priority
          };
          
          // Update last updated timestamp
          subscription.lastUpdated = Date.now();
          
          const updateEvent: StockUpdateEvent = {
            symbol,
            price,
            timestamp
          };
          
          this.eventEmitter.emit('stockUpdate', updateEvent);
          
          // Also emit symbol-specific event
          this.eventEmitter.emit(`stockUpdate:${symbol}`, updateEvent);
        } else if (message.ev === 'status') {
          console.log('Polygon stocks status message:', message.message);
        }
      }
    } catch (error) {
      console.error('Error processing stocks WebSocket message:', error);
    }
  };
  
  /**
   * Handle WebSocket messages for options
   */
  private handleOptionsMessage = (event: MessageEvent): void => {
    try {
      // The data should be an array of messages
      const data = JSON.parse(event.data);
      
      // Handle array of messages or single message
      const messages = Array.isArray(data) ? data : [data];
      
      for (const message of messages) {
        // Handle different message types
        if (message.ev === 'T') {
          // Trade event for options
          const symbol = message.sym;
          const price = message.p;
          const size = message.s;
          const timestamp = message.t;
          
          // Get subscription for throttling
          const subscription = this.subscriptions.get(symbol);
          
          // Skip if no subscription (shouldn't happen normally)
          if (!subscription) continue;
          
          // Check if we should throttle the update based on priority
          if (this.shouldThrottleUpdate(subscription.priority)) {
            continue;
          }
          
          // Track the update for throttling
          this.trackUpdate(subscription.priority);
          
          // Extract underlying symbol (format is typically O:AAPL210917C00150000)
          const underlyingMatch = symbol.match(/^O:([A-Z]+)/);
          const underlyingSymbol = underlyingMatch ? underlyingMatch[1] : '';
          
          // Update internal cache
          this.optionDataCache[symbol] = {
            price,
            timestamp,
            priority: subscription.priority
          };
          
          // Update last updated timestamp
          subscription.lastUpdated = Date.now();
          
          const updateEvent: OptionUpdateEvent = {
            symbol,
            underlyingSymbol,
            price,
            size,
            timestamp
          };
          
          this.eventEmitter.emit('optionUpdate', updateEvent);
          
          // Also emit symbol-specific event
          this.eventEmitter.emit(`optionUpdate:${symbol}`, updateEvent);
        } else if (message.ev === 'status') {
          console.log('Polygon options status message:', message.message);
        }
      }
    } catch (error) {
      console.error('Error processing options WebSocket message:', error);
    }
  };
  
  /**
   * Handle WebSocket errors
   */
  private handleError = (error: Event, market: Market): void => {
    if (market === Market.STOCKS) {
      console.error('Polygon Stocks WebSocket error:', error);
      this.connectionStates[Market.STOCKS] = ConnectionState.ERROR;
      this.emitConnectionStateChange(Market.STOCKS);
    } else if (market === Market.OPTIONS) {
      console.error('Polygon Options WebSocket error:', error);
      this.connectionStates[Market.OPTIONS] = ConnectionState.ERROR;
      this.emitConnectionStateChange(Market.OPTIONS);
    }
  };
  
  /**
   * Handle WebSocket close event
   */
  private handleClose = (market: Market): void => {
    if (market === Market.STOCKS) {
      console.log(`Polygon Stocks WebSocket closed`);
      this.connectionStates[Market.STOCKS] = ConnectionState.DISCONNECTED;
      this.emitConnectionStateChange(Market.STOCKS);
      this.clearTimers(Market.STOCKS);
      
      // Schedule reconnect if closure wasn't intentional
      this.scheduleReconnect(Market.STOCKS);
    } else if (market === Market.OPTIONS) {
      console.log(`Polygon Options WebSocket closed`);
      this.connectionStates[Market.OPTIONS] = ConnectionState.DISCONNECTED;
      this.emitConnectionStateChange(Market.OPTIONS);
      this.clearTimers(Market.OPTIONS);
      
      // Schedule reconnect if closure wasn't intentional
      this.scheduleReconnect(Market.OPTIONS);
    }
  };
  
  /**
   * Emit connection state change event
   */
  private emitConnectionStateChange(market: Market): void {
    this.eventEmitter.emit(`connectionStateChange:${market}`, this.getConnectionState(market));
    
    // For backwards compatibility
    if (market === Market.STOCKS) {
      this.eventEmitter.emit('connectionStateChange', this.getConnectionState(market));
    }
  }
  
  /**
   * Send subscription requests for all stocks
   */
  private sendStockSubscriptions(): void {
    if (!this.stocksWS) return;
    
    const stockSymbols = [...this.subscriptions.values()]
      .filter(sub => sub.market === Market.STOCKS && sub.priority !== SubscriptionPriority.PAUSED)
      .map(sub => `Q.${sub.symbol}`);
    
    if (stockSymbols.length === 0) return;
    
    try {
      // Send in batches of 100 to avoid message size limitations
      const batchSize = 100;
      for (let i = 0; i < stockSymbols.length; i += batchSize) {
        const batch = stockSymbols.slice(i, i + batchSize);
        this.stocksWS.send({ action: 'subscribe', params: batch.join(',') });
      }
      
      console.log(`Subscribed to ${stockSymbols.length} stocks`);
    } catch (error) {
      console.error('Error sending stock subscriptions:', error);
    }
  }
  
  /**
   * Send subscription requests for all options
   */
  private sendOptionSubscriptions(): void {
    if (!this.optionsWS) return;
    
    const optionSymbols = [...this.subscriptions.values()]
      .filter(sub => sub.market === Market.OPTIONS && sub.priority !== SubscriptionPriority.PAUSED)
      .map(sub => `T.${sub.symbol}`);
    
    if (optionSymbols.length === 0) return;
    
    try {
      // Send in batches of 100 to avoid message size limitations
      const batchSize = 100;
      for (let i = 0; i < optionSymbols.length; i += batchSize) {
        const batch = optionSymbols.slice(i, i + batchSize);
        this.optionsWS.send({ action: 'subscribe', params: batch.join(',') });
      }
      
      console.log(`Subscribed to ${optionSymbols.length} options`);
    } catch (error) {
      console.error('Error sending option subscriptions:', error);
    }
  }
  
  /**
   * Start heartbeat timer to keep connection alive
   */
  private startHeartbeat(market: Market): void {
    this.clearHeartbeat(market);
    
    this.heartbeatTimers[market] = setInterval(() => {
      if (market === Market.STOCKS && this.stocksWS && this.connectionStates[Market.STOCKS] === ConnectionState.CONNECTED) {
        // For Polygon WebSocket, you don't need to send heartbeats as the server handles this
        // This is kept as a connection status check
      } else if (market === Market.OPTIONS && this.optionsWS && this.connectionStates[Market.OPTIONS] === ConnectionState.CONNECTED) {
        // For Polygon WebSocket, you don't need to send heartbeats as the server handles this
        // This is kept as a connection status check
      }
    }, 30000); // 30 seconds
  }
  
  /**
   * Clear heartbeat timer
   */
  private clearHeartbeat(market: Market): void {
    if (this.heartbeatTimers[market]) {
      clearInterval(this.heartbeatTimers[market]!);
      this.heartbeatTimers[market] = null;
    }
  }
  
  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(market: Market): void {
    this.clearReconnectTimer(market);
    
    if (this.reconnectAttempts[market] >= this.maxReconnectAttempts) {
      console.log(`Max reconnect attempts reached for ${market}`);
      return;
    }
    
    if (market === Market.STOCKS) {
      this.connectionStates[Market.STOCKS] = ConnectionState.RECONNECTING;
    } else if (market === Market.OPTIONS) {
      this.connectionStates[Market.OPTIONS] = ConnectionState.RECONNECTING;
    }
    
    this.emitConnectionStateChange(market);
    
    // Use exponential backoff for reconnect
    const delay = Math.min(
      30000, // Max 30 seconds
      this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts[market])
    );
    
    console.log(`Scheduling reconnect for ${market} in ${delay}ms (attempt ${this.reconnectAttempts[market] + 1})`);
    
    this.reconnectTimers[market] = setTimeout(() => {
      this.reconnectAttempts[market]++;
      this.connect(market);
    }, delay);
  }
  
  /**
   * Clear reconnect timer
   */
  private clearReconnectTimer(market: Market): void {
    if (this.reconnectTimers[market]) {
      clearTimeout(this.reconnectTimers[market]!);
      this.reconnectTimers[market] = null;
    }
  }
  
  /**
   * Clear all timers
   */
  private clearTimers(market: Market): void {
    this.clearHeartbeat(market);
    this.clearReconnectTimer(market);
  }
  
  /**
   * Clean up on service destroy
   */
  public destroy(): void {
    // Disconnect from all WebSockets
    this.disconnect(Market.STOCKS);
    this.disconnect(Market.OPTIONS);
    
    // Clear all throttle timers
    Object.keys(this.throttleTimers).forEach(priorityKey => {
      const priority = Number(priorityKey) as SubscriptionPriority;
      if (this.throttleTimers[priority]) {
        clearInterval(this.throttleTimers[priority]!);
        this.throttleTimers[priority] = null;
      }
    });
    
    // Remove event listeners
    if (Platform.OS !== 'web') {
      // @ts-ignore - TypeScript doesn't recognize the remove method but it exists
      AppState.removeEventListener('change', this.handleAppStateChange);
    } else if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    
    // Remove all event listeners
    this.eventEmitter.removeAllListeners();
  }
  
  /**
   * Make a REST API call to Polygon.io through the proxy Edge Function
   */
  public async makePolygonRequest(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: any): Promise<any> {
    try {
      const baseUrl = 'https://api.polygon.io/';
      const apiKey = POLYGON_API_KEY;
      const { data: sessionData } = await supabase.auth.getSession();
      const authToken = sessionData.session?.access_token;
      if (!authToken) {
        throw new Error('No authentication token found');
      }
      
      // First try using the Edge Function
      try {
        // Call through Supabase Edge Function
        const polygonProxyUrl = `${SUPABASE_URL}/functions/v1/polygon-proxy`;
        
        const response = await fetch(`${polygonProxyUrl}?endpoint=${encodeURIComponent(endpoint)}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: body ? JSON.stringify(body) : undefined
        });
        
        if (!response.ok) {
          throw new Error(`Polygon proxy returned ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (proxyError) {
        console.error('Polygon proxy error:', proxyError);
        console.log('Falling back to direct API call');
        
        // Fall back to direct API call
        const url = `${baseUrl}${endpoint}${endpoint.includes('?') ? '&' : '?'}apiKey=${apiKey}`;
        
        const directResponse = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined
        });
        
        if (!directResponse.ok) {
          throw new Error(`Polygon API returned ${directResponse.status}: ${directResponse.statusText}`);
        }
        
        return await directResponse.json();
      }
    } catch (error) {
      console.error('Error making Polygon request:', error);
      throw error;
    }
  }
  
  /**
   * Force an immediate update for a symbol regardless of throttling
   * This is useful when a user explicitly requests fresh data
   */
  public forceUpdate(symbol: string, market: Market = Market.STOCKS): void {
    let formattedSymbol = symbol.toUpperCase();
    
    // Handle option symbol format
    if (market === Market.OPTIONS && !formattedSymbol.startsWith('O:')) {
      formattedSymbol = `O:${formattedSymbol}`;
    }
    
    const subscription = this.subscriptions.get(formattedSymbol);
    
    if (subscription) {
      // Temporarily upgrade to CRITICAL priority to bypass throttling
      const originalPriority = subscription.priority;
      subscription.priority = SubscriptionPriority.CRITICAL;
      
      // After a short delay, reset to original priority
      setTimeout(() => {
        const sub = this.subscriptions.get(formattedSymbol);
        if (sub) {
          sub.priority = originalPriority;
        }
      }, 1000);
    }
  }
}

export default PolygonWebSocketManager;