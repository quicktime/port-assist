import { FINNHUB_API_KEY, ALPHA_VANTAGE_API_KEY, POLYGON_API_KEY } from "@env";
// Option 1: Alpha Vantage API
// Get a free API key at https://www.alphavantage.co/
const fetchStockPriceAlphaVantage = async (symbol: string) => {
    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
      );
      const data = await response.json();
      
      // Check if we have valid data
      if (data['Global Quote'] && data['Global Quote']['05. price']) {
        const currentPrice = parseFloat(data['Global Quote']['05. price']);
        
        // For target price, you might want to use another endpoint or API
        // This is a simple placeholder calculation
        const targetPrice = currentPrice * 1.15; // 15% higher as a placeholder
        
        return {
          currentPrice,
          targetPrice
        };
      } else {
        console.error('Invalid response from Alpha Vantage:', data);
        return {
          currentPrice: null,
          targetPrice: null
        };
      }
    } catch (error) {
      console.error('Error fetching from Alpha Vantage:', error);
      return {
        currentPrice: null,
        targetPrice: null
      };
    }
  };
  
  // Option 2: Finnhub API
  // Get a free API key at https://finnhub.io/
  export const fetchStockPriceFinnhub = async (symbol: string) => {
    try {      
      // Get current price
      const quoteResponse = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`
      );
      const quoteData = await quoteResponse.json();
      
      // Get price target from analysts
      const targetResponse = await fetch(
        `https://finnhub.io/api/v1/stock/price-target?symbol=${symbol}&token=${FINNHUB_API_KEY}`
      );
      const targetData = await targetResponse.json();
      
      return {
        currentPrice: quoteData.c || null, // Current price
        targetPrice: targetData.targetMean || null // Mean price target from analysts
      };
    } catch (error) {
      console.error('Error fetching from Finnhub:', error);
      return {
        currentPrice: null,
        targetPrice: null
      };
    }
  };
  
  // Option 3: Yahoo Finance API (via RapidAPI)
  // Get a RapidAPI key at https://rapidapi.com/
  const fetchStockPriceYahooFinance = async (symbol: string) => {
    try {
      const API_KEY = 'YOUR_RAPIDAPI_KEY'; // Replace with your API key
      
      const response = await fetch(
        `https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/v2/get-summary?symbol=${symbol}&region=US`,
        {
          headers: {
            'x-rapidapi-host': 'apidojo-yahoo-finance-v1.p.rapidapi.com',
            'x-rapidapi-key': API_KEY
          }
        }
      );
      
      const data = await response.json();
      
      // Extract current price
      const currentPrice = data.price?.regularMarketPrice?.raw || null;
      
      // Extract target price
      // Note: Yahoo Finance API doesn't always provide target prices
      // You might need to calculate it based on other metrics
      const targetPrice = data.financialData?.targetMeanPrice?.raw || null;
      
      return {
        currentPrice,
        targetPrice
      };
    } catch (error) {
      console.error('Error fetching from Yahoo Finance:', error);
      return {
        currentPrice: null,
        targetPrice: null
      };
    }
  };
  
  // Option 4: IEX Cloud API
  // Get an API key at https://iexcloud.io/
  const fetchStockPriceIEXCloud = async (symbol: string) => {
    try {
      const API_KEY = 'YOUR_IEX_API_KEY'; // Replace with your API key
      
      // Get quote data
      const quoteResponse = await fetch(
        `https://cloud.iexapis.com/stable/stock/${symbol}/quote?token=${API_KEY}`
      );
      const quoteData = await quoteResponse.json();
      
      // Get analyst ratings
      const analystResponse = await fetch(
        `https://cloud.iexapis.com/stable/stock/${symbol}/recommendation-trends?token=${API_KEY}`
      );
      const analystData = await analystResponse.json();
      
      // Calculate target price based on average price target
      // This is a placeholder logic - you may need to adjust based on actual data structure
      const targetPrice = analystData[0]?.priceTarget || null;
      
      return {
        currentPrice: quoteData.latestPrice || null,
        targetPrice
      };
    } catch (error) {
      console.error('Error fetching from IEX Cloud:', error);
      return {
        currentPrice: null,
        targetPrice: null
      };
    }
  };
  
  // Option 5: Polygon.io API
  // Get an API key at https://polygon.io/
  const fetchStockPricePolygon = async (symbol: string) => {
    try {
      // Get current price
      const response = await fetch(
        `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${symbol}?apiKey=${POLYGON_API_KEY}`
      );
      
      const data = await response.json();
      
      const currentPrice = data.ticker?.lastTrade?.p || null;
      
      // Polygon doesn't provide target prices directly
      // You could use another API for that or calculate based on historical data
      const targetPrice = null;
      
      return {
        currentPrice,
        targetPrice
      };
    } catch (error) {
      console.error('Error fetching from Polygon.io:', error);
      return {
        currentPrice: null,
        targetPrice: null
      };
    }
  };
  
  // For stock symbol autocomplete suggestion (predictive text)
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