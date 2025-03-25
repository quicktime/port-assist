// src/services/polygon/apiService.ts
import { POLYGON_API_KEY } from '@env';
import { restClient } from '@polygon.io/client-js';
import { 
  StockData, 
  OptionData, 
  ConnectionState, 
  Market, 
  StockSearchResult 
} from './types';
import { polygonWebSocketService, SubscriptionPriority, makePolygonRequest } from './webSocketService';

// Initialize the Polygon.io REST client
const polygonRest = restClient(POLYGON_API_KEY);

// Price cache to minimize API calls
// We keep a separate cache from the WebSocket service to handle non-streaming data
const priceCache: Record<string, {
  price: number;
  timestamp: number;
  expiresAt: number;
}> = {};

// Cache expiration times (ms)
const CACHE_CONFIG = {
  DEFAULT_EXPIRATION: 5 * 60 * 1000,     // 5 minutes
  COMPANY_DETAILS: 24 * 60 * 60 * 1000,  // 24 hours
  HISTORICAL_DATA: 60 * 60 * 1000,       // 1 hour
  OPTION_EXPIRATIONS: 60 * 60 * 1000,    // 1 hour
  OPTION_CHAINS: 15 * 60 * 1000,         // 15 minutes
  STOCK_DETAILS: 8 * 60 * 60 * 1000      // 8 hours
};

// API request batching configuration
const BATCH_CONFIG = {
  MAX_SYMBOLS_PER_REQUEST: 50,   // Max symbols per API request
  BATCH_WINDOW: 50,              // Time window for batching requests (ms)
  MAX_CONCURRENT_REQUESTS: 5     // Maximum number of concurrent API requests
};

// Keep track of pending batched requests
interface PendingBatchRequest {
  timer: NodeJS.Timeout;
  symbols: string[];
  resolve: (result: Record<string, StockData>) => void;
  reject: (error: any) => void;
}

// Track pending batch requests
let pendingStockBatchRequest: PendingBatchRequest | null = null;

/**
 * Function to fetch market status
 */
export const fetchMarketStatus = async (): Promise<string> => {
  try {
    // Try getting status from WebSocket first
    const state = polygonWebSocketService.getConnectionState(Market.STOCKS);
    
    // If WebSocket is connected, return that status
    if (state === ConnectionState.CONNECTED) {
      return 'open';
    }
    
    // Otherwise fall back to REST API through proxy
    try {
      const endpoint = 'v1/marketstatus/now';
      const data = await makePolygonRequest(endpoint);
      
      if (data && data.market === 'open') {
        return 'open';
      } else if (data && data.market === 'closed') {
        return 'closed';
      } else {
        return 'extended-hours';
      }
    } catch (proxyError) {
      console.error('Error fetching market status via proxy:', proxyError);
      
      // Fall back to direct client if proxy fails
      const status = await polygonRest.reference.marketStatus();
      return status?.market || 'unknown';
    }
  } catch (error) {
    console.error('Error fetching market status:', error);
    return 'unknown';
  }
};

/**
 * Check if a WebSocket price is fresh enough to use
 * @param timestamp WebSocket data timestamp
 * @returns true if the data is fresh enough to use
 */
function isWebSocketDataFresh(timestamp: number): boolean {
  const MAX_AGE = 2 * 60 * 1000; // 2 minutes
  return (Date.now() - timestamp) < MAX_AGE;
}

/**
 * Function to fetch current stock price with optimized WebSocket integration
 */
export const fetchStockPrice = async (symbol: string): Promise<StockData> => {
  try {
    const symbolUpper = symbol.toUpperCase();
    
    // 1. First try: Check if we have real-time data from WebSocket
    if (polygonWebSocketService.getConnectionState(Market.STOCKS) === ConnectionState.CONNECTED) {
      // Subscribe to updates with HIGH priority (portfolio item)
      polygonWebSocketService.subscribeStock(symbolUpper, SubscriptionPriority.HIGH);
      
      // Try to get the current price from the WebSocket service
      const wsData = polygonWebSocketService.getStockData()[symbolUpper];
      
      if (wsData && isWebSocketDataFresh(wsData.timestamp)) {
        const realtimePrice = wsData.price;
        
        // Update cache
        priceCache[symbolUpper] = {
          price: realtimePrice,
          timestamp: Date.now(),
          expiresAt: Date.now() + CACHE_CONFIG.DEFAULT_EXPIRATION
        };
        
        // Create return object
        // We'll set some estimated values, actual data will be updated on next subscription update
        return {
          ticker: symbolUpper,
          currentPrice: realtimePrice,
          previousClose: realtimePrice * 0.995, // Estimate
          change: realtimePrice * 0.005,
          changePercent: 0.5
        };
      }
    }

    // 2. Second try: Check cache
    const cachedData = priceCache[symbolUpper];
    if (cachedData && cachedData.expiresAt > Date.now()) {
      // Subscribe for future updates (if we're online) with HIGH priority
      if (polygonWebSocketService.getConnectionState() === ConnectionState.CONNECTED) {
        polygonWebSocketService.subscribe(symbolUpper, SubscriptionPriority.HIGH);
      }
      
      return {
        ticker: symbolUpper,
        currentPrice: cachedData.price,
        previousClose: cachedData.price * 0.995, // Estimate
        change: cachedData.price * 0.005,
        changePercent: 0.5
      };
    }

    // 3. Third try: Use Edge Function with exponential backoff
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        // Call the proxy Edge Function
        const endpoint = `v2/aggs/ticker/${symbolUpper}/prev`;
        const response = await makePolygonRequest(endpoint);
        
        if (response.results && response.results.length > 0) {
          const result = response.results[0];
          const change = (result.c ?? 0) - (result.o ?? 0);
          const changePercent = (change / (result.o ?? 1)) * 100;

          // Update cache
          priceCache[symbolUpper] = {
            price: result.c ?? 0,
            timestamp: Date.now(),
            expiresAt: Date.now() + CACHE_CONFIG.DEFAULT_EXPIRATION
          };

          // Subscribe to this symbol for future updates via WebSocket with HIGH priority
          if (polygonWebSocketService.getConnectionState() === ConnectionState.CONNECTED) {
            polygonWebSocketService.subscribe(symbolUpper, SubscriptionPriority.HIGH);
          } else if (polygonWebSocketService.getConnectionState() === ConnectionState.DISCONNECTED) {
            // Try to connect if disconnected
            polygonWebSocketService.connect();
            // Then subscribe
            polygonWebSocketService.subscribe(symbolUpper, SubscriptionPriority.HIGH);
          }

          return {
            ticker: symbolUpper,
            currentPrice: result.c ?? 0,
            previousClose: result.o ?? 0,
            change,
            changePercent
          };
        }
        
        // If we got here, no results were found, try direct API as fallback
        break;
      } catch (error) {
        attempts++;
        
        if (attempts >= maxAttempts) {
          // Try direct API as a last resort
          break;
        }
        
        // Exponential backoff delay
        const delay = Math.pow(2, attempts) * 1000;
        console.log(`Retrying fetchStockPrice for ${symbolUpper} in ${delay}ms (attempt ${attempts})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // 4. Fourth try: Fall back to direct REST client
    try {
      const response = await polygonRest.stocks.previousClose(symbolUpper);
      
      if (response.results && response.results.length > 0) {
        const result = response.results[0];
        const change = (result.c ?? 0) - (result.o ?? 0);
        const changePercent = (change / (result.o ?? 1)) * 100;

        // Update cache
        priceCache[symbolUpper] = {
          price: result.c ?? 0,
          timestamp: Date.now(),
          expiresAt: Date.now() + CACHE_CONFIG.DEFAULT_EXPIRATION
        };

        return {
          ticker: symbolUpper,
          currentPrice: result.c ?? 0,
          previousClose: result.o ?? 0,
          change,
          changePercent
        };
      }
    } catch (directApiError) {
      console.error(`Error using direct API for ${symbol}:`, directApiError);
    }
    
    // 5. Final try: Use expired cache as last resort
    const expiredCache = priceCache[symbolUpper];
    if (expiredCache) {
      console.log(`Using expired cache data for ${symbolUpper} from ${new Date(expiredCache.timestamp).toLocaleTimeString()}`);
      return {
        ticker: symbolUpper,
        currentPrice: expiredCache.price,
        previousClose: expiredCache.price * 0.995, // Estimate
        change: expiredCache.price * 0.005,
        changePercent: 0.5
      };
    }
    
    throw new Error('No data available');
  } catch (error) {
    console.error(`Error fetching stock price for ${symbol}:`, error);
    throw error;
  }
};

/**
 * Processes a batch of stock symbols to fetch prices
 */
const processBatchedStockPriceRequest = async (symbols: string[]): Promise<Record<string, StockData>> => {
  if (!symbols || symbols.length === 0) {
    return {};
  }
  
  // Chunk the symbols into batches of MAX_SYMBOLS_PER_REQUEST
  const chunks: string[][] = [];
  for (let i = 0; i < symbols.length; i += BATCH_CONFIG.MAX_SYMBOLS_PER_REQUEST) {
    chunks.push(symbols.slice(i, i + BATCH_CONFIG.MAX_SYMBOLS_PER_REQUEST));
  }
  
  // Process each chunk in parallel
  const results = await Promise.all(
    chunks.map(async (chunk) => {
      // First get any prices available from WebSocket
      const wsResults = getWebSocketPrices(chunk);
      
      // Determine which symbols need to be fetched from the API
      const symbolsToFetch = chunk.filter(symbol => !wsResults[symbol]);
      
      if (symbolsToFetch.length === 0) {
        return wsResults;
      }
      
      try {
        // Call the API for the remaining symbols
        const apiResults = await fetchStockPricesFromAPI(symbolsToFetch);
        
        // Merge WebSocket and API results
        return { ...wsResults, ...apiResults };
      } catch (error) {
        console.error(`Error fetching stock prices for chunk: ${chunk.join(',')}`, error);
        return wsResults; // Return whatever we got from WebSocket
      }
    })
  );
  
  // Merge all results from different chunks
  return results.reduce((merged, result) => ({ ...merged, ...result }), {});
};

/**
 * Get prices from WebSocket for a batch of symbols
 */
const getWebSocketPrices = (symbols: string[]): Record<string, StockData> => {
  const stockDataCache = polygonWebSocketService.getStockData();
  const results: Record<string, StockData> = {};
  
  symbols.forEach(symbol => {
    const symbolUpper = symbol.toUpperCase();
    const wsData = stockDataCache[symbolUpper];
    
    // Only use WebSocket data if it's fresh
    if (wsData && isWebSocketDataFresh(wsData.timestamp)) {
      const price = wsData.price;
      
      // We don't have all the data from WebSocket, so we'll create a stock data object
      // with some estimated values. This is fine for the portfolio view.
      results[symbolUpper] = {
        ticker: symbolUpper,
        currentPrice: price,
        previousClose: price * 0.995, // Estimate
        change: price * 0.005,
        changePercent: 0.5
      };
    }
  });
  
  return results;
};

/**
 * Fetch stock prices from API
 */
const fetchStockPricesFromAPI = async (symbols: string[]): Promise<Record<string, StockData>> => {
  if (symbols.length === 0) return {};
  
  try {
    // Format the symbols for the API request
    const tickersParam = symbols.join(',');
    
    // Call the API through the proxy
    const endpoint = `v2/snapshot/locale/us/markets/stocks/tickers?tickers=${tickersParam}`;
    const response = await makePolygonRequest(endpoint);
    
    const results: Record<string, StockData> = {};
    
    if (response.tickers) {
      response.tickers.forEach((ticker: any) => {
        const symbol = ticker.ticker;
        const dayData = ticker.day || {};
        const prevDayData = ticker.prevDay || {};
        
        const currentPrice = dayData.c || prevDayData.c || 0;
        const previousClose = prevDayData.c || 0;
        const change = currentPrice - previousClose;
        const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
        
        // Update cache
        priceCache[symbol] = {
          price: currentPrice,
          timestamp: Date.now(),
          expiresAt: Date.now() + CACHE_CONFIG.DEFAULT_EXPIRATION
        };
        
        results[symbol] = {
          ticker: symbol,
          currentPrice,
          previousClose,
          change,
          changePercent
        };
      });
    }
    
    return results;
  } catch (error) {
    console.error(`Error fetching stock prices from API for: ${symbols.join(',')}`, error);
    
    // Fall back to direct client if proxy fails
    try {
      // We'll need to fetch each symbol individually
      const individualResults = await Promise.all(
        symbols.map(async (symbol) => {
          try {
            const data = await fetchStockPrice(symbol);
            return { symbol, data };
          } catch (e) {
            return { symbol, data: null };
          }
        })
      );
      
      // Convert array to object
      const results: Record<string, StockData> = {};
      individualResults.forEach(item => {
        if (item.data) {
          results[item.symbol] = item.data;
        }
      });
      
      return results;
    } catch (directError) {
      console.error(`Error fetching stock prices directly for: ${symbols.join(',')}`, directError);
      return {};
    }
  }
};

/**
 * Function to batch fetch stock prices with smart batching
 */
export const fetchStockPrices = async (symbols: string[]): Promise<Record<string, StockData>> => {
  if (!symbols || symbols.length === 0) {
    return {};
  }
  
  // Ensure symbols are uppercase and unique
  const upperSymbols = [...new Set(symbols.map(s => s.toUpperCase()))];
  
  // Subscribe all symbols to WebSocket for future updates
  if (polygonWebSocketService.getConnectionState(Market.STOCKS) === ConnectionState.CONNECTED) {
    upperSymbols.forEach(symbol => 
      polygonWebSocketService.subscribeStock(symbol, SubscriptionPriority.HIGH));
  } else if (polygonWebSocketService.getConnectionState(Market.STOCKS) === ConnectionState.DISCONNECTED) {
    // Try to connect if disconnected
    polygonWebSocketService.connect(Market.STOCKS);
    upperSymbols.forEach(symbol => 
      polygonWebSocketService.subscribeStock(symbol, SubscriptionPriority.HIGH));
  }
  
  // Check if a batch is already in progress
  if (pendingStockBatchRequest) {
    // Add our symbols to the existing batch
    pendingStockBatchRequest.symbols = [
      ...new Set([...pendingStockBatchRequest.symbols, ...upperSymbols])
    ];
    
    // Create and return a promise that will be resolved when the batch is processed
    return new Promise((resolve, reject) => {
      const originalResolve = pendingStockBatchRequest!.resolve;
      
      // Override the resolve function to filter results for our symbols
      pendingStockBatchRequest!.resolve = (results) => {
        originalResolve(results);
        
        // Filter results for our symbols only
        const filteredResults: Record<string, StockData> = {};
        upperSymbols.forEach(symbol => {
          if (results[symbol]) {
            filteredResults[symbol] = results[symbol];
          }
        });
        
        resolve(filteredResults);
      };
      
      pendingStockBatchRequest!.reject = (error) => {
        reject(error);
      };
    });
  }
  
  // Create a new batch request
  return new Promise((resolve, reject) => {
    pendingStockBatchRequest = {
      symbols: upperSymbols,
      resolve,
      reject,
      timer: setTimeout(async () => {
        const symbolsToProcess = [...pendingStockBatchRequest!.symbols];
        const resolveFunction = pendingStockBatchRequest!.resolve;
        const rejectFunction = pendingStockBatchRequest!.reject;
        
        // Clear the pending batch
        pendingStockBatchRequest = null;
        
        try {
          const results = await processBatchedStockPriceRequest(symbolsToProcess);
          resolveFunction(results);
        } catch (error) {
          console.error('Error processing batched stock price request:', error);
          rejectFunction(error);
        }
      }, BATCH_CONFIG.BATCH_WINDOW)
    };
  });
};

/**
 * Function to batch update portfolio items with current prices
 */
export const batchUpdatePortfolioPrices = async (portfolioItems: any[]): Promise<any[]> => {
  if (!portfolioItems || portfolioItems.length === 0) {
    return [];
  }
  
  // Extract unique symbols
  const symbols = [...new Set(portfolioItems.map(item => item.symbol))];
  
  // Fetch all prices in one batch
  const priceData = await fetchStockPrices(symbols);
  
  // Update portfolio items with the price data
  return portfolioItems.map(item => {
    const stockData = priceData[item.symbol];
    
    if (stockData) {
      const currentPrice = stockData.currentPrice;
      const value = currentPrice * item.shares;
      const cost_basis = item.avg_price * item.shares;
      const profit_loss = value - cost_basis;
      const profit_loss_percent = cost_basis > 0 ? (profit_loss / cost_basis) * 100 : 0;
      
      return {
        ...item,
        current_price: currentPrice,
        value,
        cost_basis,
        profit_loss,
        profit_loss_percent
      };
    }
    
    return item;
  });
};

/**
 * Function to batch update options with current prices
 */
export const batchUpdateOptionPrices = async (optionItems: any[]): Promise<any[]> => {
  if (!optionItems || optionItems.length === 0) {
    return [];
  }
  
  // Connect to options WebSocket if not already connected
  if (polygonWebSocketService.getConnectionState(Market.OPTIONS) === ConnectionState.DISCONNECTED) {
    polygonWebSocketService.connect(Market.OPTIONS);
  }
  
  // Process options in parallel
  const updatedOptions = await Promise.all(optionItems.map(async (item) => {
    try {
      // Make sure option symbol has O: prefix
      let optionSymbol = item.symbol;
      if (!optionSymbol.startsWith('O:')) {
        optionSymbol = `O:${optionSymbol}`;
      }
      
      // Subscribe to this option for real-time updates with appropriate priority
      polygonWebSocketService.subscribeOption(optionSymbol, SubscriptionPriority.LOW);
      
      // Get current price from WebSocket first
      const currentPrice = polygonWebSocketService.getOptionPrice(optionSymbol);
      
      if (currentPrice !== null) {
        return {
          ...item,
          current_price: currentPrice
        };
      }
      
      // Fall back to API if WebSocket data is not available
      try {
        // Extract underlying symbol
        const match = optionSymbol.match(/^O:([A-Z]+)/);
        const underlyingSymbol = match ? match[1] : '';
        
        if (!underlyingSymbol) {
          console.error(`Invalid option symbol format: ${optionSymbol}`);
          return item;
        }
        
        // Use the snapshot API to get current price
        const endpoint = `v3/snapshot/options/${underlyingSymbol}/${optionSymbol}`;
        const response = await makePolygonRequest(endpoint);
        
        if (response.results && response.results.day) {
          return {
            ...item,
            current_price: response.results.day.close || item.current_price || 0
          };
        }
      } catch (apiError) {
        console.error(`Error fetching option details via API for ${optionSymbol}:`, apiError);
      }
      
      return item;
    } catch (error) {
      console.error(`Error updating option price for ${item.symbol}:`, error);
      return item;
    }
  }));
  
  return updatedOptions;
};

/**
 * Function to fetch options data for a specific symbol
 */
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

    try {
      // First try using the Edge Function proxy
      const endpoint = `v3/reference/options/contracts?underlying_ticker=${underlyingSymbol}&expiration_date=${expDate}&limit=100`;
      const response = await makePolygonRequest(endpoint);
      
      console.log(`Fetched ${(response.results || []).length} options for ${underlyingSymbol} expiring on ${expDate}`);

      if (response.results && response.results.length > 0) {
        // Subscribe to these options for future updates (throttled)
        response.results.forEach((option: any) => {
          polygonWebSocketService.subscribeOption(option.ticker, SubscriptionPriority.LOW);
        });
        
        // Map API response to our OptionData interface
        return Promise.all(
          response.results.map(async (option: any) => {
            // Fetch additional data like last price and greeks
            const details = await fetchOptionDetails(option.ticker);
            
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
          })
        );
      }
    } catch (proxyError) {
      console.error(`Error using proxy for options data ${underlyingSymbol}:`, proxyError);
      // Fall back to direct client if proxy fails
    }
    
    // Fall back to using the direct client
    const response = await polygonRest.reference.optionsContracts({
      underlying_ticker: underlyingSymbol,
      expiration_date: expDate,
      limit: 100
    });

    console.log(`Fetched ${(response.results ?? []).length} options for ${underlyingSymbol} expiring on ${expDate}`);

    if (response.results && response.results.length > 0) {
      // Subscribe to these options for future updates (throttled)
      response.results.forEach((option: any) => {
        polygonWebSocketService.subscribeOption(option.ticker, SubscriptionPriority.LOW);
      });
      
      // Map API response to our OptionData interface
      return Promise.all(
        response.results.map(async (option: any) => {
          // Fetch additional data like last price and greeks
          const details = await fetchOptionDetails(option.ticker);
          
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
        })
      );
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching options data for ${underlyingSymbol}:`, error);
    throw error;
  }
};

/**
 * Function to fetch available expiration dates for options
 */
export const fetchOptionsExpirations = async (
  underlyingSymbol: string
): Promise<string[]> => {
  try {
    // Check cache first
    const cacheKey = `${underlyingSymbol}_expirations`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
      try {
        const { expirations, timestamp } = JSON.parse(cachedData);
        
        // If cache is still valid, use it
        if ((Date.now() - timestamp) < CACHE_CONFIG.OPTION_EXPIRATIONS) {
          return expirations;
        }
      } catch (e) {
        // Ignore cache parse errors
      }
    }
    
    // Try using the Edge Function proxy first
    try {
      const endpoint = `v3/reference/options/contracts?underlying_ticker=${underlyingSymbol}`;
      const response = await makePolygonRequest(endpoint);
      
      if (response.results) {
        // Extract and sort the expiration dates
        const dates = response.results
          .map((contract: any) => contract.expiration_date)
          .filter((date: string, index: number, self: string[]) => 
            self.indexOf(date) === index  // Remove duplicates
          )
          .sort();
        
        // Cache the results
        localStorage.setItem(cacheKey, JSON.stringify({
          expirations: dates,
          timestamp: Date.now()
        }));
        
        return dates;
      }
    } catch (proxyError) {
      console.error(`Error fetching expirations via proxy for ${underlyingSymbol}:`, proxyError);
      // Fall back to direct client
    }
    
    // Fall back to direct client
    return polygonRest.reference.optionsContracts({ underlying_ticker: underlyingSymbol })
      .then(response => {
        if (response.results) {
          // Extract and sort the expiration dates
          const dates = response.results
            .map((contract: any) => contract.expiration_date)
            .filter((date: string, index: number, self: string[]) => 
              self.indexOf(date) === index  // Remove duplicates
            )
            .sort();
          
          // Cache the results
          localStorage.setItem(cacheKey, JSON.stringify({
            expirations: dates,
            timestamp: Date.now()
          }));
          
          return dates;
        }
        return [];
      });
  } catch (error) {
    console.error(`Error fetching option expirations for ${underlyingSymbol}:`, error);
    throw error;
  }
};

/**
 * Function to fetch option details with WebSocket integration
 */
const fetchOptionDetails = async (optionSymbol: string): Promise<any> => {
  try {
    // For options, we need to make sure it has the O: prefix
    let formattedSymbol = optionSymbol.toUpperCase();
    if (!formattedSymbol.startsWith('O:')) {
      formattedSymbol = `O:${formattedSymbol}`;
    }
    
    // Parse the option symbol to get the underlying asset
    const match = formattedSymbol.match(/^O:([A-Z]+)/);
    const underlyingAsset = match ? match[1] : '';
    
    if (!underlyingAsset) {
      throw new Error(`Invalid option symbol format: ${formattedSymbol}`);
    }
    
    // Step 1: Try to connect and subscribe to WebSocket for real-time updates
    if (polygonWebSocketService.getConnectionState(Market.OPTIONS) === ConnectionState.DISCONNECTED) {
      polygonWebSocketService.connect(Market.OPTIONS);
    }
    
    // Subscribe to this option for future updates
    polygonWebSocketService.subscribeOption(formattedSymbol, SubscriptionPriority.LOW);
    
    // Step 2: Try to get last price from WebSocket cache first
    const wsData = polygonWebSocketService.getOptionData()[formattedSymbol];
    const lastPriceFromWS = wsData && isWebSocketDataFresh(wsData.timestamp) ? wsData.price : null;
    
    // Step 3: Try to fetch snapshot using Edge Function proxy
    try {
      const endpoint = `v3/snapshot/options/${underlyingAsset}/${formattedSymbol}`;
      const snapshotResponse = await makePolygonRequest(endpoint);
      
      // Extract data from snapshot response
      const snapshot = snapshotResponse.results;
      
      // Use WebSocket price if available, otherwise fallback to snapshot price
      const lastPrice = lastPriceFromWS !== null 
        ? lastPriceFromWS 
        : (snapshot?.day?.close || 0);
      
      const details = {
        lastPrice,
        bidPrice: snapshot?.last_quote?.bid || 0,
        askPrice: snapshot?.last_quote?.ask || 0,
        openInterest: snapshot?.open_interest || 0,
        volume: snapshot?.day?.volume || 0,
        impliedVolatility: snapshot?.implied_volatility || 0,
        greeks: {
          delta: snapshot?.greeks?.delta || 0,
          gamma: snapshot?.greeks?.gamma || 0,
          theta: snapshot?.greeks?.theta || 0,
          vega: snapshot?.greeks?.vega || 0,
        }
      };
      
      return details;
    } catch (proxyError) {
      console.error(`Error fetching option details via proxy for ${optionSymbol}:`, proxyError);
      // Fall back to direct REST API
    }
    
    // Step 4: Fall back to direct REST API if proxy fails
    try {
      const snapshotResponse = await polygonRest.options.snapshotOptionContract(
        underlyingAsset,  // underlying asset (e.g., AAPL)
        formattedSymbol,  // full option symbol
        {}                // query parameters
      );
      
      // Extract data from snapshot response
      const snapshot = snapshotResponse.results;
      
      // Use WebSocket price if available, otherwise fallback to snapshot price
      const lastPrice = lastPriceFromWS !== null 
        ? lastPriceFromWS 
        : (snapshot?.day?.close || 0);
      
      const details = {
        lastPrice,
        bidPrice: snapshot?.last_quote?.bid || 0,
        askPrice: snapshot?.last_quote?.ask || 0,
        openInterest: snapshot?.open_interest || 0,
        volume: snapshot?.day?.volume || 0,
        impliedVolatility: snapshot?.implied_volatility || 0,
        greeks: {
          delta: snapshot?.greeks?.delta || 0,
          gamma: snapshot?.greeks?.gamma || 0,
          theta: snapshot?.greeks?.theta || 0,
          vega: snapshot?.greeks?.vega || 0,
        }
      };
      
      return details;
    } catch (error) {
      console.error(`Error fetching option details for ${optionSymbol}:`, error);
      // Return default values if there's an error
      return {
        lastPrice: lastPriceFromWS || 0,
        bidPrice: 0,
        askPrice: 0,
        openInterest: 0,
        volume: 0,
        impliedVolatility: 0,
        greeks: {
          delta: 0,
          gamma: 0,
          theta: 0,
          vega: 0
        }
      };
    }
  } catch (error) {
    console.error(`Error fetching option details for ${optionSymbol}:`, error);
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
        vega: 0
      }
    };
  }
};

/**
 * Function to fetch company details
 */
export const fetchCompanyDetails = async (symbol: string): Promise<any> => {
  try {
    // Check cache first
    const cacheKey = `company_${symbol.toUpperCase()}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
      try {
        const { details, timestamp } = JSON.parse(cachedData);
        
        // If cache is still valid, use it
        if ((Date.now() - timestamp) < CACHE_CONFIG.COMPANY_DETAILS) {
          return details;
        }
      } catch (e) {
        // Ignore cache parse errors
      }
    }
    
    // Try using the Edge Function proxy first
    try {
      const endpoint = `v3/reference/tickers/${symbol.toUpperCase()}`;
      const response = await makePolygonRequest(endpoint);
      
      if (response.results) {
        const details = {
          ticker: response.results?.ticker,
          name: response.results?.name,
          sector: response.results?.sic_description,
          marketCap: response.results?.market_cap,
          description: response.results?.description
        };
        
        // Cache the results
        localStorage.setItem(cacheKey, JSON.stringify({
          details,
          timestamp: Date.now()
        }));
        
        return details;
      }
    } catch (proxyError) {
      console.error(`Error fetching company details via proxy for ${symbol}:`, proxyError);
      // Fall back to direct client
    }
    
    // Fall back to direct client
    const details = (await polygonRest.reference.tickerDetails(symbol.toUpperCase())).results;
    const formattedDetails = {
      ticker: details?.ticker,
      name: details?.name,
      sector: details?.sic_description,
      marketCap: details?.market_cap,
      description: details?.description
    };
    
    // Cache the results
    localStorage.setItem(cacheKey, JSON.stringify({
      details: formattedDetails,
      timestamp: Date.now()
    }));
    
    return formattedDetails;
  } catch (error) {
    console.error(`Error fetching company details for ${symbol}:`, error);
    throw error;
  }
};

/**
 * Function to fetch historical prices
 */
export const fetchHistoricalPrices = async (
  symbol: string, 
  from: string, 
  to: string, 
  timespan: '1d' | '1h' | '1m' = '1d',
  multiplier: number = 1
): Promise<{
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}[]> => {
  try {
    // Generate cache key
    const cacheKey = `historical_${symbol}_${from}_${to}_${timespan}_${multiplier}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
      try {
        const { data, timestamp } = JSON.parse(cachedData);
        
        // If cache is still valid, use it
        if ((Date.now() - timestamp) < CACHE_CONFIG.HISTORICAL_DATA) {
          return data;
        }
      } catch (e) {
        // Ignore cache parse errors
      }
    }
    
    // Try using the Edge Function proxy first
    try {
      const endpoint = `v2/aggs/ticker/${symbol.toUpperCase()}/range/${multiplier}/${timespan}/${from}/${to}`;
      const response = await makePolygonRequest(endpoint);
      
      if (response.results) {
        const formattedData = (response.results ?? []).map((result: any) => ({
          date: new Date(result.t).toISOString().split('T')[0],
          open: result.o,
          high: result.h,
          low: result.l,
          close: result.c,
          volume: result.v
        }));
        
        // Cache the results
        localStorage.setItem(cacheKey, JSON.stringify({
          data: formattedData,
          timestamp: Date.now()
        }));
        
        return formattedData;
      }
    } catch (proxyError) {
      console.error(`Error fetching historical prices via proxy for ${symbol}:`, proxyError);
      // Fall back to direct client
    }
    
    // Fall back to direct client
    const results = (await polygonRest.stocks.aggregates(
      symbol.toUpperCase(), 
      multiplier, 
      timespan, 
      from, 
      to
    )).results;

    const formattedData = (results ?? []).map((result: any) => ({
      date: new Date(result.t).toISOString().split('T')[0],
      open: result.o,
      high: result.h,
      low: result.l,
      close: result.c,
      volume: result.v
    }));
    
    // Cache the results
    localStorage.setItem(cacheKey, JSON.stringify({
      data: formattedData,
      timestamp: Date.now()
    }));
    
    return formattedData;
  } catch (error) {
    console.error(`Error fetching historical prices for ${symbol}:`, error);
    throw error;
  }
};

/**
 * Function to search for stocks
 */
export const searchStocks = async (query: string): Promise<StockSearchResult[]> => {
  try {
    // Try using the Edge Function proxy first
    try {
      const endpoint = `v3/reference/tickers?search=${encodeURIComponent(query)}`;
      const response = await makePolygonRequest(endpoint);
      
      if (response.results) {
        return (response.results ?? []).map((result: any) => ({
          ticker: result.ticker,
          name: result.name,
          market: result.market,
          type: result.type,
          primary_exchange: result.primary_exchange,
          locale: result.locale,
          active: result.active
        }));
      }
    } catch (proxyError) {
      console.error(`Error searching stocks via proxy with query ${query}:`, proxyError);
      // Fall back to direct client
    }
    
    // Fall back to direct client
    const results = await polygonRest.reference.tickers({ search: query });

    return (results.results ?? []).map((result: any) => ({
      ticker: result.ticker,
      name: result.name,
      market: result.market,
      type: result.type,
      primary_exchange: result.primary_exchange,
      locale: result.locale,
      active: result.active
    }));
  } catch (error) {
    console.error(`Error searching stocks with query ${query}:`, error);
    throw error;
  }
};

/**
 * Function to get stock suggestions
 */
export const getStockSuggestions = async (
  query: string, 
  limit: number = 5
): Promise<StockSearchResult[]> => {
  try {
    // Generate cache key
    const cacheKey = `suggestions_${query}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData && query.length > 1) {
      try {
        const { results, timestamp } = JSON.parse(cachedData);
        
        // Cache suggestions for 1 hour
        if ((Date.now() - timestamp) < 60 * 60 * 1000) {
          return results.slice(0, limit);
        }
      } catch (e) {
        // Ignore cache parse errors
      }
    }
    
    const results = await searchStocks(query);
    
    // Cache results for future queries
    if (query.length > 1) {
      localStorage.setItem(cacheKey, JSON.stringify({
        results,
        timestamp: Date.now()
      }));
    }
    
    return results.slice(0, limit);
  } catch (error) {
    console.error(`Error getting stock suggestions for ${query}:`, error);
    return [];
  }
};