// src/screens/services/polygonWebSocketService.ts
import { POLYGON_API_KEY } from '@env';
import axios from 'axios';

// Simple EventEmitter implementation for React Native
class SimpleEventEmitter {
  private listeners: Record<string, Function[]> = {};

  on(event: string, callback: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: Function): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(
      listener => listener !== callback
    );
  }

  emit(event: string, ...args: any[]): void {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Error in ${event} event handler:`, error);
      }
    });
  }

  // Helper to increase max listeners count (stub for compatibility)
  setMaxListeners(n: number): void {
    // Not needed in our simple implementation
  }
}

// Types
export interface StockData {
  ticker: string;
  name?: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
}

export interface OptionGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho?: number;
}

export interface OptionData {
  symbol: string;
  underlyingSymbol: string;
  expirationDate: string;
  strikePrice: number;
  optionType: 'call' | 'put';
  lastPrice: number;
  bidPrice: number;
  askPrice: number;
  openInterest: number;
  volume: number;
  impliedVolatility: number;
  greeks: OptionGreeks;
}

// Define the MarketStatus interface
export interface MarketStatus {
  market: string;
  serverTime: string;
  exchanges: {
    nyse: string;
    nasdaq: string;
    otc: string;
  };
  currencies: {
    fx: string;
    crypto: string;
  };
  isOpen: boolean;
  nextOpenDate: string;
  nextCloseDate: string;
}

// Market status cache to reduce REST calls
let cachedMarketStatus: MarketStatus | null = null;
let marketStatusExpiry: number = 0;
const MARKET_STATUS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Extended WebSocket class that handles reconnects and message handling
class PolygonWebSocketManager {
  private ws: WebSocket | null = null;
  private readonly apiKey: string;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: any = null;
  private subscriptions: Set<string> = new Set();
  public events: SimpleEventEmitter = new SimpleEventEmitter();
  // New property to track last heartbeat
  private lastHeartbeat: number = 0;
  private heartbeatInterval: any = null;
  
  constructor() {
    this.apiKey = POLYGON_API_KEY;
    // Set max listeners (no-op in our implementation but kept for API compatibility)
    this.events.setMaxListeners(100);
  }

  // Connect to Polygon.io WebSocket
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected && this.ws) {
        resolve();
        return;
      }

      try {
        // Using React Native compatible WebSocket
        this.ws = new WebSocket(`wss://socket.polygon.io/stocks`);

        this.ws.onopen = () => {
          console.log('WebSocket connection established with Polygon.io');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Authenticate
          this.authenticate();
          
          // Resubscribe to previous channels if any
          this.resubscribe();
          
          // Setup heartbeat checking
          this.setupHeartbeat();
          
          resolve();
        };

        this.ws.onclose = (event) => {
          console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
          this.isConnected = false;
          this.cleanupHeartbeat();
          this.handleReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          if (!this.isConnected) {
            reject(error);
          }
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            // Update heartbeat timestamp
            this.lastHeartbeat = Date.now();
            this.handleMessage(data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        reject(error);
      }
    });
  }

  // Authenticate with API key
  private authenticate(): void {
    // Check if the WebSocket is open - use 1 for OPEN in React Native WebSocket
    if (!this.ws || this.ws.readyState !== 1) return;
    
    this.ws.send(JSON.stringify({
      action: 'auth',
      params: this.apiKey
    }));
  }

  // Handle reconnection logic
  private handleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      // Exponential backoff with jitter to prevent thundering herd problem
      const baseDelay = 1000 * Math.pow(2, this.reconnectAttempts);
      const jitter = Math.random() * 1000; // Add up to 1 second of jitter
      const delay = Math.min(baseDelay + jitter, 30000);
      
      console.log(`Attempting to reconnect in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts})`);
      
      // Use setTimeout directly rather than a property to avoid any potential memory leaks
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectTimeout = null;
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
          // Immediately try to reconnect again
          this.handleReconnect();
        });
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      this.events.emit('max_reconnect_attempts');
      
      // Reset reconnect attempts after a longer delay to try again
      setTimeout(() => {
        this.reconnectAttempts = 0;
        this.handleReconnect();
      }, 60000); // Try again after 1 minute
    }
  }

  // Handle incoming messages
  private handleMessage(message: any): void {
    // Handle authentication response
    if (message.ev === 'status') {
      this.lastHeartbeat = Date.now(); // Update heartbeat on status messages
      
      if (message.status === 'auth_success') {
        console.log('Successfully authenticated with Polygon.io');
        this.events.emit('authenticated');
      } else if (message.status === 'auth_failed') {
        console.error('Authentication failed:', message.message);
        this.events.emit('auth_failed', message.message);
      }
      return;
    }
    
    // Handle heartbeat message from Polygon
    if (message.ev === 'heartbeat' || message.type === 'heartbeat') {
      this.lastHeartbeat = Date.now();
      // Don't forward heartbeat messages to subscribers
      return;
    }

    // Forward the message to event listeners
    if (message.ev) {
      this.events.emit(message.ev, message);
      // Also emit ticker-specific events
      if (message.sym) {
        this.events.emit(`${message.ev}.${message.sym}`, message);
      }
    }
  }

  // Setup heartbeat monitoring
  private setupHeartbeat(): void {
    this.lastHeartbeat = Date.now();
    
    // Clear any existing interval
    this.cleanupHeartbeat();
    
    // Check for heartbeats every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      // If no heartbeat in 2 minutes, reconnect
      if (now - this.lastHeartbeat > 2 * 60 * 1000) {
        console.log('No heartbeat received for 2 minutes, reconnecting...');
        this.cleanupHeartbeat();
        if (this.ws) {
          this.ws.close();
        }
      }
    }, 30 * 1000);
  }

  // Clean up heartbeat monitoring
  private cleanupHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Subscribe to a specific ticker
  subscribe(channel: string, ticker: string): void {
    // React Native WebSocket states: 0 = CONNECTING, 1 = OPEN, 2 = CLOSING, 3 = CLOSED
    if (!this.ws || this.ws.readyState !== 1) { // 1 = OPEN
      // Add to subscriptions set to resubscribe when connection is established
      this.subscriptions.add(`${channel}.${ticker}`);
      
      // Try to connect if not already connecting
      if (!this.isConnected && (!this.ws || this.ws.readyState !== 0)) { // 0 = CONNECTING
        this.connect().catch(error => {
          console.error('Connection failed:', error);
        });
      }
      return;
    }

    this.subscriptions.add(`${channel}.${ticker}`);
    
    this.ws.send(JSON.stringify({
      action: 'subscribe',
      params: `${channel}.${ticker}`
    }));
  }

  // Unsubscribe from a specific ticker
  unsubscribe(channel: string, ticker: string): void {
    if (!this.ws || this.ws.readyState !== 1) return; // 1 = OPEN
    
    const subscriptionKey = `${channel}.${ticker}`;
    this.subscriptions.delete(subscriptionKey);
    
    this.ws.send(JSON.stringify({
      action: 'unsubscribe',
      params: subscriptionKey
    }));
  }

  // Resubscribe to all previous subscriptions
  private resubscribe(): void {
    if (!this.ws || this.ws.readyState !== 1) return; // 1 = OPEN
    
    if (this.subscriptions.size > 0) {
      this.ws.send(JSON.stringify({
        action: 'subscribe',
        params: Array.from(this.subscriptions).join(',')
      }));
    }
  }

  // Disconnect WebSocket
  disconnect(): void {
    this.cleanupHeartbeat();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
      this.subscriptions.clear();
      
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
    }
  }
}

// Singleton instance
const wsManager = new PolygonWebSocketManager();

// Real-time stock price with WebSocket
export const subscribeToStockPrice = async (
  symbol: string, 
  callback: (data: StockData) => void
): Promise<() => void> => {
  try {
    // Ensure connection is established
    await wsManager.connect();
    
    // Create handler for ticker events
    const handleUpdate = (data: any) => {
      // For T (trade) events
      if (data.p && data.o) {
        const change = data.p - data.o;
        const changePercent = (change / data.o) * 100;

        const stockData: StockData = {
          ticker: symbol,
          currentPrice: data.p,
          previousClose: data.o,
          change,
          changePercent
        };

        callback(stockData);
      }
    };

    // Subscribe to ticker
    wsManager.subscribe('T', symbol);
    
    // Listen for updates
    wsManager.events.on(`T.${symbol}`, handleUpdate);
    
    // Return unsubscribe function
    return () => {
      wsManager.events.off(`T.${symbol}`, handleUpdate);
      wsManager.unsubscribe('T', symbol);
    };
  } catch (error) {
    console.error(`Error subscribing to ${symbol}:`, error);
    throw error;
  }
};

// Get stock price initially (we'll still need this for the first load)
export const fetchStockPrice = async (symbol: string): Promise<StockData> => {
  return new Promise((resolve, reject) => {
    let timeout: NodeJS.Timeout | null = null;
    let resolved = false;
    
    // Set a timeout in case we don't get data in reasonable time
    timeout = setTimeout(() => {
      if (!resolved) {
        wsManager.events.off(`T.${symbol}`, handleFirstTrade);
        reject(new Error('Timeout waiting for stock price data'));
      }
    }, 10000); // 10 second timeout
    
    // Handle the first trade event
    const handleFirstTrade = (data: any) => {
      if (data.p && data.o) {
        const change = data.p - data.o;
        const changePercent = (change / data.o) * 100;
        
        const stockData: StockData = {
          ticker: symbol,
          currentPrice: data.p,
          previousClose: data.o,
          change,
          changePercent
        };
        
        wsManager.events.off(`T.${symbol}`, handleFirstTrade);
        
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        
        resolved = true;
        resolve(stockData);
      }
    };
    
    // Subscribe and listen for data
    wsManager.connect()
      .then(() => {
        wsManager.subscribe('T', symbol);
        wsManager.events.on(`T.${symbol}`, handleFirstTrade);
      })
      .catch(error => {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        reject(error);
      });
  });
};

// Function to fetch current market status
export const fetchMarketStatus = async (): Promise<MarketStatus> => {
  // Check cache first to avoid unnecessary REST calls
  const now = Date.now();
  if (cachedMarketStatus && marketStatusExpiry > now) {
    return cachedMarketStatus;
  }
  
  try {
    const response = await axios.get(
      `https://api.polygon.io/v1/marketstatus/now`,
      {
        headers: {
          'Authorization': `Bearer ${POLYGON_API_KEY}`
        }
      }
    );

    const data = response.data;
    
    // Transform the API response into our MarketStatus interface
    const marketStatus: MarketStatus = {
      market: data.market,
      serverTime: data.serverTime,
      exchanges: {
        nyse: data.exchanges.nyse,
        nasdaq: data.exchanges.nasdaq,
        otc: data.exchanges.otc,
      },
      currencies: {
        fx: data.currencies.fx,
        crypto: data.currencies.crypto,
      },
      isOpen: 
        data.exchanges.nyse === 'open' || 
        data.exchanges.nasdaq === 'open',
      nextOpenDate: data.nextOpen,
      nextCloseDate: data.nextClose
    };
    
    // Cache the result
    cachedMarketStatus = marketStatus;
    
    // Set expiry - shorter if market is open, longer if closed
    const isOpen = marketStatus.isOpen;
    marketStatusExpiry = now + (isOpen ? 
      MARKET_STATUS_CACHE_DURATION : // 5 mins if market is open
      60 * 60 * 1000); // 1 hour if market is closed
    
    return marketStatus;
  } catch (error) {
    console.error('Error fetching market status:', error);
    
    // Return cached data if available, even if expired
    if (cachedMarketStatus) {
      return cachedMarketStatus;
    }
    
    // Return default values if there's an error and no cache
    return {
      market: 'unknown',
      serverTime: new Date().toISOString(),
      exchanges: {
        nyse: 'unknown',
        nasdaq: 'unknown',
        otc: 'unknown'
      },
      currencies: {
        fx: 'unknown',
        crypto: 'unknown'
      },
      isOpen: false,
      nextOpenDate: '',
      nextCloseDate: ''
    };
  }
};

// Options cache to reduce REST API calls
const optionsCache = new Map<string, {
  data: OptionData[],
  expiry: number
}>();
const optionsExpirationsCache = new Map<string, {
  data: string[],
  expiry: number
}>();

// Options cache duration - 15 minutes during market hours, 1 hour when closed
const getOptionsCacheDuration = async (): Promise<number> => {
  const marketStatus = await fetchMarketStatus();
  return marketStatus.isOpen ? 15 * 60 * 1000 : 60 * 60 * 1000;
};

export const fetchOptionsData = async (
  underlyingSymbol: string,
  expirationDate?: string
): Promise<OptionData[]> => {
  try {
    // If no expiration date is provided, get the next expiration date
    let expDate = expirationDate;
    if (!expDate) {
      const expirations = await fetchOptionsExpirations(underlyingSymbol);
      if (expirations.length > 0) {
        expDate = expirations[0];
      } else {
        throw new Error('No expiration dates available');
      }
    }
    
    // Check cache
    const cacheKey = `${underlyingSymbol}-${expDate}`;
    const cached = optionsCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && cached.expiry > now) {
      return cached.data;
    }

    const response = await axios.get(
      `https://api.polygon.io/v3/reference/options/contracts?underlying_ticker=${underlyingSymbol}&expiration_date=${expDate}`,
      {
        headers: {
          'Authorization': `Bearer ${POLYGON_API_KEY}`
        }
      }
    );

    if (response.data.results && response.data.results.length > 0) {
      // To minimize API calls, we'll batch fetch the details for multiple options
      // Use local price cache during processing to avoid duplicating REST calls
      const priceCache = new Map<string, any>();
      
      // Process options in smaller batches to avoid overloading
      const batchSize = 10;
      const results = response.data.results;
      const optionsData: OptionData[] = [];
      
      for (let i = 0; i < results.length; i += batchSize) {
        const batch = results.slice(i, i + batchSize);
        const batchPromises = batch.map(async (option: any) => {
          // Get option details - reuse cached data when possible
          let details;
          if (!priceCache.has(option.ticker)) {
            details = await fetchOptionDetails(option.ticker);
            priceCache.set(option.ticker, details);
          } else {
            details = priceCache.get(option.ticker);
          }
          
          return {
            symbol: option.ticker,
            underlyingSymbol: option.underlying_ticker,
            expirationDate: option.expiration_date,
            strikePrice: option.strike_price,
            optionType: option.contract_type.toLowerCase(),
            lastPrice: details.lastPrice || 0,
            bidPrice: details.bidPrice || 0,
            askPrice: details.askPrice || 0,
            openInterest: details.openInterest || 0,
            volume: details.volume || 0,
            impliedVolatility: details.impliedVolatility || 0,
            greeks: details.greeks || {
              delta: 0,
              gamma: 0,
              theta: 0,
              vega: 0
            }
          };
        });
        
        const batchResults = await Promise.all(batchPromises);
        optionsData.push(...batchResults);
      }
      
      // Cache the result
      const cacheDuration = await getOptionsCacheDuration();
      optionsCache.set(cacheKey, {
        data: optionsData,
        expiry: now + cacheDuration
      });
      
      return optionsData;
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching options data for ${underlyingSymbol}:`, error);
    
    // Return cached data if available, even if expired
    const cacheKey = `${underlyingSymbol}-${expirationDate}`;
    const cached = optionsCache.get(cacheKey);
    if (cached) {
      return cached.data;
    }
    
    throw error;
  }
};

export const subscribeToOptionData = async (
  optionSymbol: string,
  callback: (data: Partial<OptionData>) => void
): Promise<() => void> => {
  try {
    // Ensure connection is established
    await wsManager.connect();
    
    // Create handler for option events
    const handleUpdate = (data: any) => {
      if (data.ev === 'T' && data.sym === optionSymbol) {
        // Process option trade data
        const optionUpdate: Partial<OptionData> = {
          symbol: optionSymbol,
          lastPrice: data.p || 0,
          volume: data.s || 0
        };

        callback(optionUpdate);
      }
    };

    // Subscribe to ticker (T channel for trades)
    wsManager.subscribe('T', optionSymbol);
    
    // Listen for updates
    wsManager.events.on(`T.${optionSymbol}`, handleUpdate);
    
    // Return unsubscribe function
    return () => {
      wsManager.events.off(`T.${optionSymbol}`, handleUpdate);
      wsManager.unsubscribe('T', optionSymbol);
    };
  } catch (error) {
    console.error(`Error subscribing to option ${optionSymbol}:`, error);
    throw error;
  }
};

// Fetch available option expiration dates with caching
export const fetchOptionsExpirations = async (
  underlyingSymbol: string
): Promise<string[]> => {
  // Check cache first
  const cacheKey = underlyingSymbol;
  const cached = optionsExpirationsCache.get(cacheKey);
  const now = Date.now();
  
  if (cached && cached.expiry > now) {
    return cached.data;
  }
  
  try {
    const response = await axios.get(
      `https://api.polygon.io/v3/reference/options/contracts?underlying_ticker=${underlyingSymbol}`,
      {
        headers: {
          'Authorization': `Bearer ${POLYGON_API_KEY}`
        }
      }
    );

    if (response.data.results && response.data.results.length > 0) {
      // Extract unique expiration dates and sort them
      const expirationDates = response.data.results
        .map((option: any) => option.expiration_date)
        .filter((value: string, index: number, self: string[]) => 
          self.indexOf(value) === index
        )
        .sort();
      
      // Cache the result
      const cacheDuration = await getOptionsCacheDuration();
      optionsExpirationsCache.set(cacheKey, {
        data: expirationDates,
        expiry: now + cacheDuration
      });
      
      return expirationDates;
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching option expirations for ${underlyingSymbol}:`, error);
    
    // Return cached data if available, even if expired
    if (cached) {
      return cached.data;
    }
    
    throw error;
  }
};

// Function to fetch details for a specific option contract with caching
// Cache for option details to reduce API calls
const optionDetailsCache = new Map<string, {
  data: any,
  expiry: number
}>();

const fetchOptionDetails = async (optionSymbol: string): Promise<any> => {
  // Check cache first
  const cached = optionDetailsCache.get(optionSymbol);
  const now = Date.now();
  
  if (cached && cached.expiry > now) {
    return cached.data;
  }
  
  try {
    // We'll use snapshot instead of individual trade/quote endpoints to reduce API calls
    const snapshotResponse = await axios.get(
      `https://api.polygon.io/v3/snapshot/options/${optionSymbol}`,
      {
        headers: {
          'Authorization': `Bearer ${POLYGON_API_KEY}`
        }
      }
    );
    
    const snapshot = snapshotResponse.data.results;
    
    if (!snapshot) {
      throw new Error('No snapshot data available');
    }
    
    const details = {
      lastPrice: snapshot.last_trade?.p || 0,
      bidPrice: snapshot.bid?.p || 0,
      askPrice: snapshot.ask?.p || 0,
      openInterest: snapshot.open_interest || 0,
      volume: snapshot.day?.v || 0,
      impliedVolatility: snapshot.implied_volatility || 0,
      greeks: {
        delta: snapshot.greeks?.delta || 0,
        gamma: snapshot.greeks?.gamma || 0,
        theta: snapshot.greeks?.theta || 0,
        vega: snapshot.greeks?.vega || 0,
        rho: snapshot.greeks?.rho || 0
      }
    };
    
    // Cache the result
    const cacheDuration = await getOptionsCacheDuration();
    optionDetailsCache.set(optionSymbol, {
      data: details,
      expiry: now + cacheDuration
    });
    
    return details;
  } catch (error) {
    console.error(`Error fetching option details for ${optionSymbol}:`, error);
    
    // Return cached data if available, even if expired
    if (cached) {
      return cached.data;
    }
    
    // Return default values if there's an error
    return {
      lastPrice: 0,
      bidPrice: 0,
      askPrice: 0,
      openInterest: 0,
      volume: 0,
      impliedVolatility: 0,
      greeks: {
        delta: 0,
        gamma: 0,
        theta: 0,
        vega: 0,
        rho: 0
      }
    };
  }
};

// Additional caches for the new functions
const searchResultsCache = new Map<string, {
  data: any[],
  expiry: number
}>();

const companyDetailsCache = new Map<string, {
  data: any,
  expiry: number
}>();

const historicalPricesCache = new Map<string, {
  data: any[],
  expiry: number
}>();

// Cache durations
const SEARCH_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const COMPANY_DETAILS_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const HISTORICAL_PRICES_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Cache management
export const clearCaches = () => {
  cachedMarketStatus = null;
  marketStatusExpiry = 0;
  optionsCache.clear();
  optionsExpirationsCache.clear();
  optionDetailsCache.clear();
  searchResultsCache.clear();
  companyDetailsCache.clear();
  historicalPricesCache.clear();
};

// Function to preload commonly needed data
export const preloadCommonData = async (symbols: string[]) => {
  try {
    // Preload market status
    await fetchMarketStatus();
    
    // Preload options expirations for common symbols
    for (const symbol of symbols) {
      await fetchOptionsExpirations(symbol);
    }
  } catch (error) {
    console.error('Error preloading common data:', error);
  }
};

// Search for stocks by name or symbol
export interface StockSearchResult {
  ticker: string;
  name: string;
  market: string;
  locale: string;
  type: string;
  currency: string;
  active: boolean;
  primaryExch: string;
  updated: string;
}

export const searchStocks = async (query: string): Promise<StockSearchResult[]> => {
  // Check cache first
  const cacheKey = query.toLowerCase().trim();
  const cached = searchResultsCache.get(cacheKey);
  const now = Date.now();
  
  if (cached && cached.expiry > now) {
    return cached.data;
  }
  
  try {
    const response = await axios.get(
      `https://api.polygon.io/v3/reference/tickers`,
      {
        params: {
          search: query,
          active: true,
          sort: 'ticker',
          order: 'asc',
          limit: 20
        },
        headers: {
          'Authorization': `Bearer ${POLYGON_API_KEY}`
        }
      }
    );
    
    if (response.data.results && response.data.results.length > 0) {
      const searchResults: StockSearchResult[] = response.data.results.map((item: any) => ({
        ticker: item.ticker,
        name: item.name,
        market: item.market,
        locale: item.locale,
        type: item.type,
        currency: item.currency,
        active: item.active,
        primaryExch: item.primary_exchange,
        updated: item.last_updated_utc
      }));
      
      // Cache the results
      searchResultsCache.set(cacheKey, {
        data: searchResults,
        expiry: now + SEARCH_CACHE_DURATION
      });
      
      return searchResults;
    }
    
    return [];
  } catch (error) {
    console.error(`Error searching for stocks with query "${query}":`, error);
    
    // Return cached results if available, even if expired
    if (cached) {
      return cached.data;
    }
    
    return [];
  }
};

// Interface for company details
export interface CompanyDetails {
  ticker: string;
  name: string;
  description: string;
  homepage: string;
  employees: number;
  industry: string;
  sector: string;
  marketCap: number;
  address: {
    address1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  logoUrl?: string;
  phone?: string;
  listDate?: string;
}

// Fetch company details for a specific ticker
export const fetchCompanyDetails = async (symbol: string): Promise<CompanyDetails | null> => {
  // Check cache first
  const cacheKey = symbol.toUpperCase();
  const cached = companyDetailsCache.get(cacheKey);
  const now = Date.now();
  
  if (cached && cached.expiry > now) {
    return cached.data;
  }
  
  try {
    // First, fetch the basic ticker details
    const response = await axios.get(
      `https://api.polygon.io/v3/reference/tickers/${symbol}`,
      {
        headers: {
          'Authorization': `Bearer ${POLYGON_API_KEY}`
        }
      }
    );
    
    if (response.data.results) {
      const ticker = response.data.results;
      
      // Format the company details
      const companyDetails: CompanyDetails = {
        ticker: ticker.ticker,
        name: ticker.name,
        description: ticker.description || '',
        homepage: ticker.homepage_url || '',
        employees: ticker.total_employees || 0,
        industry: ticker.sic_description || '',
        sector: ticker.sector || '',
        marketCap: ticker.market_cap || 0,
        address: {
          address1: ticker.address?.address1 || '',
          city: ticker.address?.city || '',
          state: ticker.address?.state || '',
          postalCode: ticker.address?.postal_code || '',
          country: ticker.address?.country || ''
        },
        logoUrl: ticker.branding?.logo_url || undefined,
        phone: ticker.phone_number || undefined,
        listDate: ticker.list_date || undefined
      };
      
      // Cache the results
      companyDetailsCache.set(cacheKey, {
        data: companyDetails,
        expiry: now + COMPANY_DETAILS_CACHE_DURATION
      });
      
      return companyDetails;
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching company details for symbol "${symbol}":`, error);
    
    // Return cached results if available, even if expired
    if (cached) {
      return cached.data;
    }
    
    return null;
  }
};

// Interface for historical price data
export interface HistoricalPrice {
  timestamp: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
  transactions?: number;
}

// Timespan for historical data
export type Timespan = '1min' | '5min' | '15min' | '30min' | '1h' | '4h' | '1d' | '1w' | '1m';

// Fetch historical prices
export const fetchHistoricalPrices = async (
  symbol: string, 
  fromDate: string,  // Format: YYYY-MM-DD
  toDate: string,    // Format: YYYY-MM-DD
  timespan: Timespan = '1d'
): Promise<HistoricalPrice[]> => {
  // Check cache first
  const cacheKey = `${symbol.toUpperCase()}-${fromDate}-${toDate}-${timespan}`;
  const cached = historicalPricesCache.get(cacheKey);
  const now = Date.now();
  
  if (cached && cached.expiry > now) {
    return cached.data;
  }
  
  try {
    const response = await axios.get(
      `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/${timespan}/${fromDate}/${toDate}`,
      {
        headers: {
          'Authorization': `Bearer ${POLYGON_API_KEY}`
        }
      }
    );
    
    if (response.data.results && response.data.results.length > 0) {
      const historicalPrices: HistoricalPrice[] = response.data.results.map((bar: any) => {
        // Convert timestamp from milliseconds to ISO string date
        const date = new Date(bar.t);
        const dateString = date.toISOString().split('T')[0];
        
        return {
          timestamp: bar.t,
          date: dateString,
          open: bar.o,
          high: bar.h,
          low: bar.l,
          close: bar.c,
          volume: bar.v,
          vwap: bar.vw,
          transactions: bar.n
        };
      });
      
      // Cache the results
      historicalPricesCache.set(cacheKey, {
        data: historicalPrices,
        expiry: now + HISTORICAL_PRICES_CACHE_DURATION
      });
      
      return historicalPrices;
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching historical prices for ${symbol}:`, error);
    
    // Return cached results if available, even if expired
    if (cached) {
      return cached.data;
    }
    
    return [];
  }
};

export { wsManager };