import { restClient } from '@polygon.io/client-js';
import { POLYGON_API_KEY } from '@env';

// Initialize the Polygon.io client
const rest = restClient(POLYGON_API_KEY);

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
    // Use the lastQuote endpoint to get the current quote
    const quoteResponse = await rest.stocks.lastQuote(symbol);
    
    // Also get the previous close for comparison
    const prevCloseResponse = await rest.stocks.previousClose(symbol);
    
    if (quoteResponse.results) {
      // Get current price from the latest quote
      // The API might return askPrice (P) or lastPrice (p)
      const askPrice = typeof quoteResponse.results.P === 'number' ? quoteResponse.results.P : 0;
      const bidPrice = typeof quoteResponse.results.p === 'number' ? quoteResponse.results.p : 0;
      // Prefer ask price, fall back to bid price
      const currentPrice = askPrice || bidPrice;
      
      // Get previous close price
      let previousClose = 0;
      if (prevCloseResponse.results && prevCloseResponse.results.length > 0) {
        previousClose = typeof prevCloseResponse.results[0].c === 'number' ? 
          prevCloseResponse.results[0].c : 0;
      }
      
      // Calculate change and percent
      const change = currentPrice - previousClose;
      const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;

      return {
        ticker: symbol,
        currentPrice,
        previousClose,
        change,
        changePercent
      };
    }
    
    throw new Error('No quote data available');
  } catch (error) {
    console.error(`Error fetching stock price for ${symbol}:`, error);
    throw error;
  }
};

// Function to fetch available expiration dates for options
export const fetchOptionsExpirations = async (
  underlyingSymbol: string
): Promise<string[]> => {
  try {
    // Use the optionsContracts endpoint to get all contracts for this symbol
    const response = await rest.reference.optionsContracts({
      "underlying_ticker": underlyingSymbol,
      limit: 1000
    });

    if (response.results && response.results.length > 0) {
      // Extract unique expiration dates, filter out undefined, and sort them
      const expirationDates = response.results
        .map(option => option.expiration_date)
        .filter((value): value is string => !!value) // Filter out undefined/null values
        .filter((value, index, self) => self.indexOf(value) === index)
        .sort();
      
      return expirationDates;
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching option expirations for ${underlyingSymbol}:`, error);
    throw error;
  }
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

    // Get all option contracts for this symbol and expiration date
    const response = await rest.reference.optionsContracts({
      "underlying_ticker": underlyingSymbol,
      "expiration_date": expDate,
      limit: 1000
    });

    if (response.results && response.results.length > 0) {
      // Process the results with proper type checking
      const optionsData: OptionData[] = [];
      
      // Process each option sequentially instead of using Promise.all
      // to better handle errors and type safety
      for (const option of response.results) {
        if (!option.ticker || !option.underlying_ticker || 
            !option.expiration_date || typeof option.strike_price !== 'number' ||
            !option.contract_type) {
          console.warn('Skipping option with incomplete data');
          continue;
        }
        
        try {
          // Convert contract type to lowercase and validate
          const contractType = option.contract_type.toLowerCase();
          if (contractType !== 'call' && contractType !== 'put') {
            console.warn(`Skipping option with invalid contract type: ${contractType}`);
            continue;
          }
          
          // Fetch additional data like last price and greeks
          const details = await fetchOptionDetails(option.ticker);
          
          // Map to our OptionData interface with guaranteed values
          optionsData.push({
            symbol: option.ticker,
            underlyingSymbol: option.underlying_ticker,
            expirationDate: option.expiration_date,
            strikePrice: option.strike_price,
            optionType: contractType as 'call' | 'put',
            lastPrice: details.lastPrice,
            bidPrice: details.bidPrice,
            askPrice: details.askPrice,
            openInterest: details.openInterest,
            volume: details.volume,
            impliedVolatility: details.impliedVolatility,
            greeks: details.greeks
          });
        } catch (error) {
          console.error(`Error processing option ${option.ticker}:`, error);
          // Continue with the next option instead of failing the entire request
        }
      }
      
      return optionsData;
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching options data for ${underlyingSymbol}:`, error);
    throw error;
  }
};

// Function to fetch details for a specific option contract
const fetchOptionDetails = async (optionSymbol: string): Promise<{
  lastPrice: number;
  bidPrice: number;
  askPrice: number;
  openInterest: number;
  volume: number;
  impliedVolatility: number;
  greeks: OptionGreeks;
}> => {
  try {
    // Fetch last trade using the trades endpoint
    const tradeResponse = await rest.stocks.lastTrade(optionSymbol);

    // For Polygon.io, we need to parse the option symbol to extract the underlying asset
    
    // Different providers use different option symbol formats
    // Common formats:
    // - O:AAPL210917C00150000 (Polygon format)
    // - AAPL_091721C150 (Some other providers)
    // - AAPL210917C00150000 (No prefix)
    
    let underlyingAsset = '';
    
    try {
      // Try to extract using various patterns
      const polygonPattern = /^(?:O:)?([A-Z]+)/;
      const matches = optionSymbol.match(polygonPattern);
      
      if (matches && matches[1]) {
        // Found using the pattern
        underlyingAsset = matches[1];
      } else {
        // Fallback: take the alphabetic prefix
        underlyingAsset = optionSymbol.replace(/[^A-Z]/g, '').substring(0, 5);
      }
      
      // If still empty, use a default fallback
      if (!underlyingAsset) {
        console.warn(`Could not extract underlying asset from option symbol: ${optionSymbol}`);
        // Try to get the first few characters as a last resort
        underlyingAsset = optionSymbol.substring(0, 4);
      }
      
      console.log(`Extracted underlying asset '${underlyingAsset}' from option symbol '${optionSymbol}'`);
    } catch (error) {
      console.error(`Error extracting underlying asset from ${optionSymbol}:`, error);
      // Last resort fallback
      underlyingAsset = optionSymbol.substring(0, 4);
    }
    
    // Fetch snapshot for bid/ask and greeks with both required parameters
    let snapshotResponse;
    
    // Check documentation if we need to format the optionSymbol differently
    // For example, some APIs expect the option contract in a specific format
    // like "O:AAPL210917C00150000" or "AAPL210917C00150000"
    
    // Make sure optionSymbol is in the right format for Polygon.io
    const formattedOptionSymbol = optionSymbol.startsWith('O:') ? 
      optionSymbol : 
      (optionSymbol.includes(':') ? optionSymbol : optionSymbol);
    
    try {
      // First attempt with the extracted underlying asset
      snapshotResponse = await rest.options.snapshotOptionContract(underlyingAsset, formattedOptionSymbol);
    } catch (error) {
      console.error(`Error fetching option snapshot with extracted ticker ${underlyingAsset}:`, error);
      
      // Try again with a different approach if the first attempt fails
      try {
        // If it's a Polygon.io specific format like "O:AAPL210917C00150000"
        if (formattedOptionSymbol.startsWith('O:')) {
          const altUnderlyingAsset = formattedOptionSymbol.substring(2).replace(/\d.*$/, '');
          snapshotResponse = await rest.options.snapshotOptionContract(altUnderlyingAsset, formattedOptionSymbol);
        } else {
          // Try with just the first 1-4 characters
          const shortTicker = formattedOptionSymbol.match(/^[A-Z]{1,4}/)?.[0] || '';
          if (shortTicker) {
            snapshotResponse = await rest.options.snapshotOptionContract(shortTicker, formattedOptionSymbol);
          } else {
            // Last resort: try with the option symbol itself as both parameters
            snapshotResponse = await rest.options.snapshotOptionContract(formattedOptionSymbol, formattedOptionSymbol);
          }
        }
      } catch (retryError) {
        console.error('Failed to fetch option snapshot after retry:', retryError);
        // Set a default empty response to prevent further errors
        snapshotResponse = {};
      }
    }

    // Use proper null checking and defaults
    const lastPrice = tradeResponse.results && typeof tradeResponse.results.p === 'number' 
      ? tradeResponse.results.p : 0;
    
    // The response structure might have data under a 'results' property
    const results = snapshotResponse?.results;
    
    // Extract data from snapshot response with thorough null checking
    // Accessing the properties safely based on Polygon API structure
    const bid = results?.last_quote?.bid || 0;
    const ask = results?.last_quote?.ask || 0;
    const dayData = results?.day || {};
    const greeksData = results?.greeks || {};
    
    const openInterest = typeof results?.open_interest === 'number' ? results.open_interest : 0;
    const volume = typeof dayData.volume === 'number' ? dayData.volume : 0;
    const impliedVolatility = typeof results?.implied_volatility === 'number' ? results.implied_volatility : 0;
    
    // Extract greeks with thorough null checking
    const delta = typeof greeksData.delta === 'number' ? greeksData.delta : 0;
    const gamma = typeof greeksData.gamma === 'number' ? greeksData.gamma : 0;
    const theta = typeof greeksData.theta === 'number' ? greeksData.theta : 0;
    const vega = typeof greeksData.vega === 'number' ? greeksData.vega : 0;
    
    const details = {
      lastPrice,
      bidPrice: bid,
      askPrice: ask,
      openInterest: openInterest,
      volume: volume,
      impliedVolatility: impliedVolatility,
      greeks: {
        delta: delta,
        gamma: gamma,
        theta: theta,
        vega: vega,
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
        vega: 0,
        rho: 0
      }
    };
  }
};