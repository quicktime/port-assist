import { FINNHUB_API_KEY, ALPHA_VANTAGE_API_KEY, POLYGON_API_KEY, FMP_API_KEY } from "@env";

// Option 1: Alpha Vantage API for stock suggestions
export const fetchStockSymbolSuggestions = async (partialSymbol: string) => {
  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${partialSymbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
    );
    
    const data = await response.json();
    
    if (data.bestMatches) {
      return data.bestMatches.map((match: any) => ({
        symbol: match['1. symbol'],
        name: match['2. name']
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching symbol suggestions:', error);
    return [];
  }
};

// Financial Modeling Prep API for stock prices and price targets
export const fetchStockPriceFMP = async (symbol: string) => {
  try {
    // Get current price using FMP's quote endpoint
    const quoteResponse = await fetch(
      `https://financialmodelingprep.com/stable/quote/?symbol=${symbol}&apikey=${FMP_API_KEY}`
    );
    
    const quoteData = await quoteResponse.json();
    
    // Get price target consensus data using FMP's price target consensus endpoint
    const targetResponse = await fetch(
      `https://financialmodelingprep.com/stable/price-target-consensus/?symbol=${symbol}&apikey=${FMP_API_KEY}`
    );
    
    const targetData = await targetResponse.json();
    
    // Extract the current price from quote data
    const currentPrice = quoteData[0]?.price || null;
    
    // Extract the target price from consensus data
    const targetPrice = targetData[0]?.targetConsensus || null;
    
    return {
      currentPrice,
      targetPrice
    };
  } catch (error) {
    console.error(`Error fetching data from FMP for ${symbol}:`, error);
    return {
      currentPrice: null,
      targetPrice: null
    };
  }
};

// Alternative: If you want to use the price target summary instead
export const fetchStockPriceFMPWithSummary = async (symbol: string) => {
  try {
    // Get current price
    const quoteResponse = await fetch(
      `https://financialmodelingprep.com/stable/quote/?symbol${symbol}&apikey=${FMP_API_KEY}`
    );
    
    const quoteData = await quoteResponse.json();
    
    // Get price target summary
    const targetResponse = await fetch(
      `https://financialmodelingprep.com/stable/price-target-summary/?symbol=${symbol}&apikey=${FMP_API_KEY}`
    );
    
    const targetData = await targetResponse.json();
    
    // Extract current price and target price
    const currentPrice = quoteData[0]?.price || null;
    
    // For target price, use priceTargetAverage from the summary
    const targetPrice = targetData[0]?.lastMonthAvgPriceTarget || null;
    
    return {
      currentPrice,
      targetPrice
    };
  } catch (error) {
    console.error(`Error fetching data from FMP with summary for ${symbol}:`, error);
    return {
      currentPrice: null,
      targetPrice: null
    };
  }
};

// Alpha Vantage API for stock prices (fallback)
export const fetchStockPriceAlphaVantage = async (symbol: string) => {
  try {
    // Get current price
    const quoteResponse = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
    );
    
    const quoteData = await quoteResponse.json();
    
    // Get overview data which sometimes includes target prices
    const overviewResponse = await fetch(
      `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
    );
    
    const overviewData = await overviewResponse.json();
    
    // Extract current price
    const currentPrice = quoteData['Global Quote'] 
      ? parseFloat(quoteData['Global Quote']['05. price']) 
      : null;
    
    // Extract target price if available (Alpha Vantage might not have this)
    // If not available, we'll estimate it as 10% above current price
    const targetPrice = overviewData.AnalystTargetPrice 
      ? parseFloat(overviewData.AnalystTargetPrice)
      : (currentPrice ? currentPrice * 1.1 : null);
    
    return {
      currentPrice,
      targetPrice
    };
  } catch (error) {
    console.error(`Error fetching data from Alpha Vantage for ${symbol}:`, error);
    return {
      currentPrice: null,
      targetPrice: null
    };
  }
};

// Main function to fetch stock price and target using available APIs
export const fetchStockPriceAndTarget = async (symbol: string) => {
  try {
    // Try FMP with price target consensus first
    const fmpData = await fetchStockPriceFMP(symbol);
    
    // If we got data from FMP, return it
    if (fmpData.currentPrice !== null) {
      return fmpData;
    }
    
    // Try FMP with price target summary as an alternative
    const fmpSummaryData = await fetchStockPriceFMPWithSummary(symbol);
    
    if (fmpSummaryData.currentPrice !== null) {
      return fmpSummaryData;
    }
    
    // If FMP failed, try Alpha Vantage
    const avData = await fetchStockPriceAlphaVantage(symbol);
    
    return avData;
  } catch (error) {
    console.error(`Error fetching stock data for ${symbol}:`, error);
    return {
      currentPrice: null,
      targetPrice: null
    };
  }
};