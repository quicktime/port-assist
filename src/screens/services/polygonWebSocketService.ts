import { POLYGON_API_KEY } from '@env';
import EventEmitter from 'eventemitter3';
import { websocketClient } from '@polygon.io/client-js';

// Define event types
export type StockUpdateEvent = {
  symbol: string;
  price: number;
  timestamp: number;
};

export type OptionUpdateEvent = {
  symbol: string;
  underlyingSymbol: string;
  price: number;
  size: number;
  timestamp: number;
};

// WebSocket connection states
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

// WebSocket market types
export enum Market {
  STOCKS = 'stocks',
  OPTIONS = 'options',
  FOREX = 'forex',
  CRYPTO = 'crypto',
}

class PolygonWebSocketService {
  private stocksWS: any = null;
  private optionsWS: any = null;
  private eventEmitter = new EventEmitter();
  private stockSubscriptions: Set<string> = new Set();
  private optionSubscriptions: Set<string> = new Set();
  private stocksConnectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private optionsConnectionState: ConnectionState = ConnectionState.DISCONNECTED;
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
  private stockDataCache: Record<string, { price: number; timestamp: number }> = {};
  private optionDataCache: Record<string, { price: number; timestamp: number }> = {};
  private maxReconnectAttempts: number = 5;
  private reconnectInterval: number = 5000;
  
  constructor() {
    // Add event listener for app state changes (for mobile)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }
  
  // Connect to Polygon WebSocket
  public connect(market: Market = Market.STOCKS): void {
    if (market === Market.STOCKS) {
      this.connectStocks();
    } else if (market === Market.OPTIONS) {
      this.connectOptions();
    }
  }
  
  // Connect to Stocks WebSocket
  private connectStocks(): void {
    if (this.stocksConnectionState === ConnectionState.CONNECTED ||
        this.stocksConnectionState === ConnectionState.CONNECTING) {
      return;
    }
    
    this.stocksConnectionState = ConnectionState.CONNECTING;
    this.emitConnectionStateChange(Market.STOCKS);
    
    try {
      // Create the WebSocket client using the Polygon.io library
      this.stocksWS = websocketClient(POLYGON_API_KEY).stocks();
      
      // Setup event handlers
      this.stocksWS.onopen = () => this.handleOpen(Market.STOCKS);
      this.stocksWS.onclose = () => this.handleClose(Market.STOCKS);
      this.stocksWS.onerror = (error: any) => this.handleError(error, Market.STOCKS);
      this.stocksWS.onmessage = (event: MessageEvent) => this.handleStocksMessage(event);
      
      console.log('Connecting to Polygon.io Stocks WebSocket...');
    } catch (error) {
      console.error('Error creating Stocks WebSocket connection:', error);
      this.stocksConnectionState = ConnectionState.ERROR;
      this.emitConnectionStateChange(Market.STOCKS);
      this.scheduleReconnect(Market.STOCKS);
    }
  }
  
  // Connect to Options WebSocket
  private connectOptions(): void {
    if (this.optionsConnectionState === ConnectionState.CONNECTED ||
        this.optionsConnectionState === ConnectionState.CONNECTING) {
      return;
    }
    
    this.optionsConnectionState = ConnectionState.CONNECTING;
    this.emitConnectionStateChange(Market.OPTIONS);
    
    try {
      // Create the WebSocket client using the Polygon.io library
      this.optionsWS = websocketClient(POLYGON_API_KEY).options();
      
      // Setup event handlers
      this.optionsWS.onopen = () => this.handleOpen(Market.OPTIONS);
      this.optionsWS.onclose = () => this.handleClose(Market.OPTIONS);
      this.optionsWS.onerror = (error: any) => this.handleError(error, Market.OPTIONS);
      this.optionsWS.onmessage = (event: MessageEvent) => this.handleOptionsMessage(event);
      
      console.log('Connecting to Polygon.io Options WebSocket...');
    } catch (error) {
      console.error('Error creating Options WebSocket connection:', error);
      this.optionsConnectionState = ConnectionState.ERROR;
      this.emitConnectionStateChange(Market.OPTIONS);
      this.scheduleReconnect(Market.OPTIONS);
    }
  }
  
  // Disconnect from WebSocket
  public disconnect(market: Market = Market.STOCKS): void {
    if (market === Market.STOCKS) {
      this.disconnectStocks();
    } else if (market === Market.OPTIONS) {
      this.disconnectOptions();
    }
  }
  
  // Disconnect from Stocks WebSocket
  private disconnectStocks(): void {
    this.clearTimers(Market.STOCKS);
    
    if (this.stocksWS) {
      try {
        // Unsubscribe from all channels before closing
        if (this.stockSubscriptions.size > 0 && this.stocksConnectionState === ConnectionState.CONNECTED) {
          this.stocksWS.send({ action: 'unsubscribe', params: Array.from(this.stockSubscriptions).join(',') });
        }
        
        // Close the connection
        this.stocksWS.close();
        this.stocksWS = null;
      } catch (error) {
        console.error('Error disconnecting from Stocks WebSocket:', error);
      }
    }
    
    this.stocksConnectionState = ConnectionState.DISCONNECTED;
    this.emitConnectionStateChange(Market.STOCKS);
  }
  
  // Disconnect from Options WebSocket
  private disconnectOptions(): void {
    this.clearTimers(Market.OPTIONS);
    
    if (this.optionsWS) {
      try {
        // Unsubscribe from all channels before closing
        if (this.optionSubscriptions.size > 0 && this.optionsConnectionState === ConnectionState.CONNECTED) {
          this.optionsWS.send({ action: 'unsubscribe', params: Array.from(this.optionSubscriptions).join(',') });
        }
        
        // Close the connection
        this.optionsWS.close();
        this.optionsWS = null;
      } catch (error) {
        console.error('Error disconnecting from Options WebSocket:', error);
      }
    }
    
    this.optionsConnectionState = ConnectionState.DISCONNECTED;
    this.emitConnectionStateChange(Market.OPTIONS);
  }
  
  // Subscribe to stock updates
  public subscribeStock(symbol: string): void {
    const symbolUpper = symbol.toUpperCase();
    
    // Add to local subscriptions
    this.stockSubscriptions.add(symbolUpper);
    
    // If connected, send subscription message
    if (this.stocksConnectionState === ConnectionState.CONNECTED && this.stocksWS) {
      try {
        // Subscribe to quotes for this symbol
        const channel = `Q.${symbolUpper}`;
        this.stocksWS.send({ action: 'subscribe', params: channel });
      } catch (error) {
        console.error(`Error subscribing to stock ${symbolUpper}:`, error);
      }
    } else if (this.stocksConnectionState === ConnectionState.DISCONNECTED) {
      // Connect if not already connected
      this.connectStocks();
    }
  }
  
  // Unsubscribe from stock updates
  public unsubscribeStock(symbol: string): void {
    const symbolUpper = symbol.toUpperCase();
    
    // Remove from local subscriptions
    this.stockSubscriptions.delete(symbolUpper);
    
    // If connected, send unsubscription message
    if (this.stocksConnectionState === ConnectionState.CONNECTED && this.stocksWS) {
      try {
        // Format symbol for quotes stream
        const channel = `Q.${symbolUpper}`;
        this.stocksWS.send({ action: 'unsubscribe', params: channel });
      } catch (error) {
        console.error(`Error unsubscribing from stock ${symbolUpper}:`, error);
      }
    }
  }
  
  // Subscribe to option updates
  public subscribeOption(optionSymbol: string): void {
    // For options, we need to make sure it has the O: prefix
    let formattedSymbol = optionSymbol.toUpperCase();
    if (!formattedSymbol.startsWith('O:')) {
      formattedSymbol = `O:${formattedSymbol}`;
    }
    
    // Add to local subscriptions
    this.optionSubscriptions.add(formattedSymbol);
    
    // If connected, send subscription message
    if (this.optionsConnectionState === ConnectionState.CONNECTED && this.optionsWS) {
      try {
        // Subscribe to trades for this option
        const channel = `T.${formattedSymbol}`;
        this.optionsWS.send({ action: 'subscribe', params: channel });
      } catch (error) {
        console.error(`Error subscribing to option ${formattedSymbol}:`, error);
      }
    } else if (this.optionsConnectionState === ConnectionState.DISCONNECTED) {
      // Connect if not already connected
      this.connectOptions();
    }
  }
  
  // Unsubscribe from option updates
  public unsubscribeOption(optionSymbol: string): void {
    // For options, we need to make sure it has the O: prefix
    let formattedSymbol = optionSymbol.toUpperCase();
    if (!formattedSymbol.startsWith('O:')) {
      formattedSymbol = `O:${formattedSymbol}`;
    }
    
    // Remove from local subscriptions
    this.optionSubscriptions.delete(formattedSymbol);
    
    // If connected, send unsubscription message
    if (this.optionsConnectionState === ConnectionState.CONNECTED && this.optionsWS) {
      try {
        // Format symbol for quotes stream
        const channel = `T.${formattedSymbol}`;
        this.optionsWS.send({ action: 'unsubscribe', params: channel });
      } catch (error) {
        console.error(`Error unsubscribing from option ${formattedSymbol}:`, error);
      }
    }
  }
  
  // Subscribe to stock updates (legacy method for backward compatibility)
  public subscribe(symbol: string): void {
    this.subscribeStock(symbol);
  }
  
  // Unsubscribe from stock updates (legacy method for backward compatibility)
  public unsubscribe(symbol: string): void {
    this.unsubscribeStock(symbol);
  }
  
  // Add event listener
  public on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }
  
  // Remove event listener
  public off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }
  
  // Public methods to access the stockDataCache
  public getStockData(): Record<string, { price: number; timestamp: number }> {
    return { ...this.stockDataCache };
  }
  
  public getStockPrice(symbol: string): number | null {
    const symbolUpper = symbol.toUpperCase();
    return this.stockDataCache[symbolUpper]?.price || null;
  }
  
  // Public methods to access the optionDataCache
  public getOptionData(): Record<string, { price: number; timestamp: number }> {
    return { ...this.optionDataCache };
  }
  
  public getOptionPrice(symbol: string): number | null {
    // For options, we need to make sure it has the O: prefix
    let formattedSymbol = symbol.toUpperCase();
    if (!formattedSymbol.startsWith('O:')) {
      formattedSymbol = `O:${formattedSymbol}`;
    }
    
    return this.optionDataCache[formattedSymbol]?.price || null;
  }
  
  // Get current connection state for a market
  public getConnectionState(market: Market = Market.STOCKS): ConnectionState {
    if (market === Market.STOCKS) {
      return this.stocksConnectionState;
    } else if (market === Market.OPTIONS) {
      return this.optionsConnectionState;
    }
    
    return ConnectionState.DISCONNECTED;
  }
  
  // Get list of current subscriptions
  public getSubscriptions(market: Market = Market.STOCKS): string[] {
    if (market === Market.STOCKS) {
      return Array.from(this.stockSubscriptions);
    } else if (market === Market.OPTIONS) {
      return Array.from(this.optionSubscriptions);
    }
    
    return [];
  }
  
  // Handle WebSocket open event for a market
  private handleOpen = (market: Market): void => {
    if (market === Market.STOCKS) {
      console.log('Polygon Stocks WebSocket connected');
      this.stocksConnectionState = ConnectionState.CONNECTED;
      this.emitConnectionStateChange(Market.STOCKS);
      this.reconnectAttempts[Market.STOCKS] = 0;
      
      // Send subscriptions for all symbols
      this.sendStockSubscriptions();
      
      // Start heartbeat
      this.startHeartbeat(Market.STOCKS);
    } else if (market === Market.OPTIONS) {
      console.log('Polygon Options WebSocket connected');
      this.optionsConnectionState = ConnectionState.CONNECTED;
      this.emitConnectionStateChange(Market.OPTIONS);
      this.reconnectAttempts[Market.OPTIONS] = 0;
      
      // Send subscriptions for all options
      this.sendOptionSubscriptions();
      
      // Start heartbeat
      this.startHeartbeat(Market.OPTIONS);
    }
  };
  
  // Handle WebSocket messages for stocks
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
          // Use bid price, could also use message.p (ask)
          const price = message.p;
          const timestamp = message.t;
          
          // Update internal cache
          this.stockDataCache[symbol] = {
            price,
            timestamp
          };
          
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
  
  // Handle WebSocket messages for options
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
          
          // Extract underlying symbol (format is typically O:AAPL210917C00150000)
          const underlyingMatch = symbol.match(/^O:([A-Z]+)/);
          const underlyingSymbol = underlyingMatch ? underlyingMatch[1] : '';
          
          // Update internal cache
          this.optionDataCache[symbol] = {
            price,
            timestamp
          };
          
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
  
  // Handle WebSocket errors
  private handleError = (error: Event, market: Market): void => {
    if (market === Market.STOCKS) {
      console.error('Polygon Stocks WebSocket error:', error);
      this.stocksConnectionState = ConnectionState.ERROR;
      this.emitConnectionStateChange(Market.STOCKS);
    } else if (market === Market.OPTIONS) {
      console.error('Polygon Options WebSocket error:', error);
      this.optionsConnectionState = ConnectionState.ERROR;
      this.emitConnectionStateChange(Market.OPTIONS);
    }
  };
  
  // Handle WebSocket close event
  private handleClose = (market: Market): void => {
    if (market === Market.STOCKS) {
      console.log(`Polygon Stocks WebSocket closed`);
      this.stocksConnectionState = ConnectionState.DISCONNECTED;
      this.emitConnectionStateChange(Market.STOCKS);
      this.clearTimers(Market.STOCKS);
      
      // Schedule reconnect if closure wasn't intentional
      this.scheduleReconnect(Market.STOCKS);
    } else if (market === Market.OPTIONS) {
      console.log(`Polygon Options WebSocket closed`);
      this.optionsConnectionState = ConnectionState.DISCONNECTED;
      this.emitConnectionStateChange(Market.OPTIONS);
      this.clearTimers(Market.OPTIONS);
      
      // Schedule reconnect if closure wasn't intentional
      this.scheduleReconnect(Market.OPTIONS);
    }
  };
  
   // Emit connection state change event
   private emitConnectionStateChange(market: Market): void {
    this.eventEmitter.emit(`connectionStateChange:${market}`, this.getConnectionState(market));
    
    // For backwards compatibility
    if (market === Market.STOCKS) {
      this.eventEmitter.emit('connectionStateChange', this.getConnectionState(market));
    }
  }
  
  // Send subscription requests for all stocks
  private sendStockSubscriptions(): void {
    if (!this.stocksWS || this.stockSubscriptions.size === 0) return;
    
    try {
      // Format symbols for quotes stream
      const params = Array.from(this.stockSubscriptions)
        .map(symbol => `Q.${symbol}`)
        .join(',');
      
      // Send subscription request
      this.stocksWS.send({ action: 'subscribe', params });
      
      console.log(`Subscribed to stocks: ${params}`);
    } catch (error) {
      console.error('Error sending stock subscriptions:', error);
    }
  }
  
  // Send subscription requests for all options
  private sendOptionSubscriptions(): void {
    if (!this.optionsWS || this.optionSubscriptions.size === 0) return;
    
    try {
      // Format symbols for trades stream
      const params = Array.from(this.optionSubscriptions)
        .map(symbol => `T.${symbol}`)
        .join(',');
      
      // Send subscription request
      this.optionsWS.send({ action: 'subscribe', params });
      
      console.log(`Subscribed to options: ${params}`);
    } catch (error) {
      console.error('Error sending option subscriptions:', error);
    }
  }
  
  // Start heartbeat timer to keep connection alive
  private startHeartbeat(market: Market): void {
    this.clearHeartbeat(market);
    
    this.heartbeatTimers[market] = setInterval(() => {
      if (market === Market.STOCKS && this.stocksWS && this.stocksConnectionState === ConnectionState.CONNECTED) {
        console.log('Sending stocks heartbeat ping...');
        // For Polygon WebSocket, you don't need to send heartbeats as the server handles this
        // This is kept as a connection status check
      } else if (market === Market.OPTIONS && this.optionsWS && this.optionsConnectionState === ConnectionState.CONNECTED) {
        console.log('Sending options heartbeat ping...');
        // For Polygon WebSocket, you don't need to send heartbeats as the server handles this
        // This is kept as a connection status check
      }
    }, 30000); // 30 seconds
  }
  
  // Clear heartbeat timer
  private clearHeartbeat(market: Market): void {
    if (this.heartbeatTimers[market]) {
      clearInterval(this.heartbeatTimers[market]);
      this.heartbeatTimers[market] = null;
    }
  }
  
  // Schedule reconnection attempt
  private scheduleReconnect(market: Market): void {
    this.clearReconnectTimer(market);
    
    if (this.reconnectAttempts[market] >= this.maxReconnectAttempts) {
      console.log(`Max reconnect attempts reached for ${market}`);
      return;
    }
    
    if (market === Market.STOCKS) {
      this.stocksConnectionState = ConnectionState.RECONNECTING;
    } else if (market === Market.OPTIONS) {
      this.optionsConnectionState = ConnectionState.RECONNECTING;
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
  
  // Clear reconnect timer
  private clearReconnectTimer(market: Market): void {
    if (this.reconnectTimers[market]) {
      clearTimeout(this.reconnectTimers[market]);
      this.reconnectTimers[market] = null;
    }
  }
  
  // Clear all timers
  private clearTimers(market: Market): void {
    this.clearHeartbeat(market);
    this.clearReconnectTimer(market);
  }
  
  // Handle document visibility change (for web)
  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      // Page is visible again, reconnect if disconnected
      if (this.stocksConnectionState === ConnectionState.DISCONNECTED) {
        this.connectStocks();
      }
      if (this.optionsConnectionState === ConnectionState.DISCONNECTED) {
        this.connectOptions();
      }
    } else {
      // Page is hidden, optionally disconnect to save resources
      // this.disconnect(Market.STOCKS);
      // this.disconnect(Market.OPTIONS);
    }
  };
  
  // Clean up on service destroy
  public destroy(): void {
    this.disconnect(Market.STOCKS);
    this.disconnect(Market.OPTIONS);
    
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    
    this.eventEmitter.removeAllListeners();
  }
}

// Create and export a singleton instance
export const polygonWebSocketService = new PolygonWebSocketService();

// Export the class for testing or custom instances
export default PolygonWebSocketService;