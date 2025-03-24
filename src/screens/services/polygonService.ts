// src/screens/services/polygonService.ts
import { POLYGON_API_KEY } from '@env';
import { restClient } from '@polygon.io/client-js';
import { polygonWebSocketService, ConnectionState, Market } from './polygonWebSocketService';

// Initialize the Polygon.io REST client
const polygonRest = restClient(POLYGON_API_KEY);

// Price cache to minimize API calls
const priceCache: Record<string, {
  price: number;
  timestamp: number;
  expiresAt: number;
}> = {};

// Cache expiration time (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

// Types for stock data
export interface StockData {
  ticker: string;
  name?: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
}

// Types for option data
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

// Function to fetch current stock price
export const fetchStockPrice = async (symbol: string): Promise<StockData> => {
  try {
    const symbolUpper = symbol.toUpperCase();
    
    // 1. First try: Check if we have real-time data from WebSocket
    if (polygonWebSocketService.getConnectionState(Market.STOCKS) === ConnectionState.CONNECTED) {
      // Subscribe to updates if not already subscribed
      polygonWebSocketService.subscribeStock(symbolUpper);
      
      // Try to get the current price from the WebSocket service
      const realtimePrice = polygonWebSocketService.getStockPrice(symbolUpper);
      
      if (realtimePrice !== null) {
        // Update cache
        priceCache[symbolUpper] = {
          price: realtimePrice,
          timestamp: Date.now(),
          expiresAt: Date.now() + CACHE_EXPIRATION
        };
        
        // Create return object (with estimated previous close)
        return {
          ticker: symbolUpper,
          currentPrice: realtimePrice,
          previousClose: realtimePrice * 0.995, // Estimate, replace with actual data if needed
          change: realtimePrice * 0.005,
          changePercent: 0.5
        };
      }
    }

    // 2. Second try: Check cache
    const cachedData = priceCache[symbolUpper];
    if (cachedData && cachedData.expiresAt > Date.now()) {
      // Subscribe for future updates if we're online
      if (polygonWebSocketService.getConnectionState() === ConnectionState.CONNECTED) {
        polygonWebSocketService.subscribe(symbolUpper);
      }
      
      return {
        ticker: symbolUpper,
        currentPrice: cachedData.price,
        previousClose: cachedData.price * 0.995, // Estimate, replace with actual data if needed
        change: cachedData.price * 0.005,
        changePercent: 0.5
      };
    }

    // 3. Third try: Fallback to REST API with exponential backoff
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        // Use the Polygon.io client library
        const response = await polygonRest.stocks.previousClose(symbolUpper);
        
        if (response.results && response.results.length > 0) {
          const result = response.results[0];
          const change = (result.c ?? 0) - (result.o ?? 0);
          const changePercent = (change / (result.o ?? 1)) * 100;

          // Update cache
          priceCache[symbolUpper] = {
            price: result.c ?? 0,
            timestamp: Date.now(),
            expiresAt: Date.now() + CACHE_EXPIRATION
          };

          // Subscribe to this symbol for future updates via WebSocket
          if (polygonWebSocketService.getConnectionState() === ConnectionState.CONNECTED) {
            polygonWebSocketService.subscribe(symbolUpper);
          } else if (polygonWebSocketService.getConnectionState() === ConnectionState.DISCONNECTED) {
            // Try to connect if disconnected
            polygonWebSocketService.connect();
            // Then subscribe
            polygonWebSocketService.subscribe(symbolUpper);
          }

          return {
            ticker: symbolUpper,
            currentPrice: result.c ?? 0,
            previousClose: result.o ?? 0,
            change,
            changePercent
          };
        }
        
        // If we got here, no results were found
        break;
      } catch (error) {
        attempts++;
        
        if (attempts >= maxAttempts) {
          // Let the outer catch block handle this
          throw error;
        }
        
        // Exponential backoff delay
        const delay = Math.pow(2, attempts) * 1000;
        console.log(`Retrying fetchStockPrice for ${symbolUpper} in ${delay}ms (attempt ${attempts})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // 4. Final try: Use expired cache as last resort
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

// Function to fetch prices for multiple stocks in a single batch
export const fetchStockPrices = async (symbols: string[]): Promise<Record<string, StockData>> => {
  if (!symbols || symbols.length === 0) {
    return {};
  }
  
  // Ensure symbols are uppercase
  const upperSymbols = symbols.map(s => s.toUpperCase());
  
  // Subscribe all symbols to WebSocket for future updates
  if (polygonWebSocketService.getConnectionState(Market.STOCKS) === ConnectionState.CONNECTED) {
    upperSymbols.forEach(symbol => polygonWebSocketService.subscribeStock(symbol));
  } else if (polygonWebSocketService.getConnectionState(Market.STOCKS) === ConnectionState.DISCONNECTED) {
    // Try to connect if disconnected
    polygonWebSocketService.connect(Market.STOCKS);
    upperSymbols.forEach(symbol => polygonWebSocketService.subscribeStock(symbol));
  }
  
  // Execute all fetch operations in parallel with fallback strategies
  const results = await Promise.all(
    upperSymbols.map(async (symbol) => {
      try {
        const data = await fetchStockPrice(symbol);
        return { symbol, data, error: null };
      } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error);
        return { symbol, data: null, error };
      }
    })
  );
  
  // Convert array of results to object keyed by symbol
  const stockDataMap: Record<string, StockData> = {};
  
  results.forEach(result => {
    if (result.data) {
      stockDataMap[result.symbol] = result.data;
    }
  });
  
  return stockDataMap;
};

// Function to batch update portfolio items with current prices
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
      const profit_loss_percent = (profit_loss / cost_basis) * 100;
      
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

// Function to batch update options with current prices
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
      
      // Subscribe to this option for real-time updates
      polygonWebSocketService.subscribeOption(optionSymbol);
      
      // Get current price
      const currentPrice = polygonWebSocketService.getOptionPrice(optionSymbol);
      
      if (currentPrice !== null) {
        return {
          ...item,
          current_price: currentPrice
        };
      }
      
      return item;
    } catch (error) {
      console.error(`Error updating option price for ${item.symbol}:`, error);
      return item;
    }
  }));
  
  return updatedOptions;
};

// Function to fetch options data for a specific symbol
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

    // Use the Polygon.io client library to fetch options contracts
    const response = await polygonRest.reference.optionsContracts({
      underlying_ticker: underlyingSymbol,
      expiration_date: expDate
    });

    if (response.results && response.results.length > 0) {
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

// Function to fetch available expiration dates for options
export const fetchOptionsExpirations = async (
  underlyingSymbol: string
): Promise<string[]> => {
  return polygonRest.reference.optionsContracts({ underlying_ticker: underlyingSymbol })
    .then(response => {
      if (response.results) {
        // Extract and sort the expiration dates
        return response.results.map((contract: any) => contract.expiration_date).sort();
      }
      return [];
    })
    .catch(error => {
      console.error(`Error fetching option expirations for ${underlyingSymbol}:`, error);
      throw error;
    });
};

// Function to fetch option details with WebSocket integration
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
    polygonWebSocketService.subscribeOption(formattedSymbol);
    
    // Step 2: Try to get last price from WebSocket cache first
    const lastPriceFromWS = polygonWebSocketService.getOptionPrice(formattedSymbol);
    
    // Step 3: Fetch snapshot from REST API for complete option data
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