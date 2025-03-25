// src/screens/services/claudeService.ts
import { supabase } from '../../initSupabase';
import { PortfolioItem } from './portfolioService';
import { OptionData, StockData } from './polygonService';
import { SUPABASE_URL, SUPABASE_KEY } from "@env";

// Types for Claude API
export interface TradeStrategyPreferences {
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  optionPreference: 'calls' | 'puts' | 'both';
  expirationPreference: 'weekly' | 'monthly' | 'quarterly' | 'leaps';
  strikePreference: 'ITM' | 'ATM' | 'OTM';
  maxTradePercentage: number; // Maximum percentage of cash to use per trade
  stopLossPercentage: number; // Default stop loss percentage
  takeProfitPercentage: number; // Default take profit percentage
  preferredStrategies: string[]; // Array of preferred strategies (e.g., ['covered calls', 'cash secured puts'])
  technicalIndicators: string[]; // Preferred technical indicators to consider
  fundamentalFactors: string[]; // Preferred fundamental factors to consider
}

export interface TradeRecommendation {
  symbol: string;
  action: 'buy' | 'sell';
  type: 'stock' | 'call option' | 'put option' | 'spread' | 'other';
  details: string;
  strike?: number;
  expiration?: string;
  quantity: number;
  estimatedCost: number;
  stopLoss?: number;
  takeProfit?: number;
  reasoning: string;
  riskLevel: 'low' | 'moderate' | 'high';
}

export interface TradeRecommendationsResponse {
  timestamp: string;
  recommendations: TradeRecommendation[];
  marketOverview: string;
  portfolioAnalysis: string;
  cashRecommendation: string;
}

/**
 * Generate a prompt for Claude based on portfolio, options, and strategy data
 */
const generatePrompt = (
  portfolio: PortfolioItem[],
  optionsData: { [symbol: string]: OptionData[] },
  stockData: { [symbol: string]: StockData },
  cashAmount: number,
  strategy: TradeStrategyPreferences
): string => {
  // Format portfolio summary
  const portfolioSummary = portfolio.map(item => 
    `${item.symbol}: ${item.shares} shares at avg price $${item.avg_price.toFixed(2)}, ` +
    `current price $${item.current_price?.toFixed(2) || 'unknown'}`
  ).join('. ');

  // Format options data for each symbol
  const optionsChainData = Object.keys(optionsData).map(symbol => {
    const options = optionsData[symbol];
    // Truncate options data to keep prompt size reasonable
    const truncatedOptions = options.slice(0, 10); // Just include 10 options per symbol as example
    
    return `${symbol} options: ${truncatedOptions.map(opt => 
      `${opt.optionType} @ $${opt.strikePrice} exp ${opt.expirationDate}, ` +
      `premium $${opt.lastPrice.toFixed(2)}, OI ${opt.openInterest}, ` +
      `IV ${(opt.impliedVolatility * 100).toFixed(1)}%, ` +
      `delta ${opt.greeks.delta.toFixed(3)}, gamma ${opt.greeks.gamma.toFixed(3)}, ` +
      `theta ${opt.greeks.theta.toFixed(3)}, vega ${opt.greeks.vega.toFixed(3)}`
    ).join('; ')}`;
  }).join('\n\n');

  // Format stock performance data
  const stockPerformanceData = Object.keys(stockData).map(symbol => {
    const stock = stockData[symbol];
    return `${symbol}: current price $${stock.currentPrice.toFixed(2)}, ` +
           `change ${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)} (${stock.changePercent.toFixed(2)}%)`;
  }).join('. ');

  // Format strategy preferences
  const strategySettings = `
    Risk tolerance: ${strategy.riskTolerance}
    Option preference: ${strategy.optionPreference}
    Expiration preference: ${strategy.expirationPreference}
    Strike preference: ${strategy.strikePreference}
    Max trade percentage: ${strategy.maxTradePercentage}%
    Stop loss percentage: ${strategy.stopLossPercentage}%
    Take profit percentage: ${strategy.takeProfitPercentage}%
    Preferred strategies: ${strategy.preferredStrategies.join(', ')}
    Technical indicators: ${strategy.technicalIndicators.join(', ')}
    Fundamental factors: ${strategy.fundamentalFactors.join(', ')}
  `;

  // Combine all data into a structured prompt
  return `
You are an experienced Day Trader with exceptional technical and fundamental analysis skills.

TRADER STRATEGY SETTINGS:
${strategySettings}

PORTFOLIO SUMMARY:
${portfolioSummary}

CURRENT CASH AVAILABLE:
$${cashAmount.toFixed(2)}

REAL-TIME STOCK PERFORMANCE:
${stockPerformanceData}

OPTIONS CHAIN DATA:
${optionsChainData}

DATE/TIME:
${new Date().toISOString()}

Based on the above information, generate specific trade recommendations that I should consider right now.

Please format your response as a JSON object with the following structure:
{
  "timestamp": "ISO date string",
  "recommendations": [
    {
      "symbol": "Stock symbol",
      "action": "buy or sell",
      "type": "stock, call option, put option, spread, or other",
      "details": "Brief description of the trade",
      "strike": "Strike price if applicable",
      "expiration": "Expiration date if applicable",
      "quantity": "Number of shares or contracts",
      "estimatedCost": "Estimated cost of the trade",
      "stopLoss": "Recommended stop loss price",
      "takeProfit": "Recommended take profit price",
      "reasoning": "Detailed explanation of the rationale behind this recommendation",
      "riskLevel": "low, moderate, or high"
    }
  ],
  "marketOverview": "Brief overview of current market conditions",
  "portfolioAnalysis": "Analysis of the current portfolio composition and performance",
  "cashRecommendation": "Recommendation on cash allocation"
}

Choose the BEST actions and provide robust explanations. Focus on specific, actionable trades rather than general advice. Consider both short-term opportunities and alignment with the overall strategy.
`;
};

/**
 * Generate trade recommendations using Claude API via Supabase Edge Function
 */
export const generateTradeRecommendations = async (
  portfolio: PortfolioItem[],
  optionsData: { [symbol: string]: OptionData[] },
  stockData: { [symbol: string]: StockData },
  cashAmount: number,
  strategy: TradeStrategyPreferences
): Promise<TradeRecommendationsResponse> => {
  try {
    const prompt = generatePrompt(portfolio, optionsData, stockData, cashAmount, strategy);
    
    // Get the user's JWT token for authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('No authenticated session found');
    }
    
    // Call our Supabase Edge Function instead of directly calling Anthropic
    const response = await fetch(`${SUPABASE_URL}/functions/v1/claude-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        model: 'claude-3-opus-20240229',
        max_tokens: 4000,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.2 // Lower temperature for more consistent outputs
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Edge function error: ${response.status} ${errorText}`);
    }

    // Parse the JSON response from Claude
    const responseData = await response.json();
    const content = responseData.content?.[0]?.text || '';
    
    // Extract JSON from the response (Claude might wrap it in additional text)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from Claude response');
    }
    
    const recommendations = JSON.parse(jsonMatch[0]) as TradeRecommendationsResponse;
    return recommendations;
  } catch (error) {
    console.error('Error generating trade recommendations:', error);
    throw error;
  }
};

/**
 * Fetch trade recommendations for the current portfolio
 */
export const getTradeRecommendations = async (
  portfolio: PortfolioItem[],
  cashAmount: number,
  strategy: TradeStrategyPreferences
): Promise<TradeRecommendationsResponse> => {
  try {
    // Fetch options data for each symbol in the portfolio
    const optionsData: { [symbol: string]: OptionData[] } = {};
    const stockData: { [symbol: string]: StockData } = {};
    
    // Process each portfolio item sequentially to avoid API rate limits
    for (const item of portfolio) {
      // Get stock data
      const stock = await import('./polygonService').then(module => 
        module.fetchStockPrice(item.symbol)
      );
      stockData[item.symbol] = stock;
      
      // Get options data
      const options = await import('./polygonService').then(module => 
        module.fetchOptionsData(item.symbol)
      );
      optionsData[item.symbol] = options;
    }
    
    // Generate recommendations using Claude API
    const recommendations = await generateTradeRecommendations(
      portfolio, 
      optionsData, 
      stockData, 
      cashAmount, 
      strategy
    );
    
    return recommendations;
  } catch (error) {
    console.error('Error fetching trade recommendations:', error);
    throw error;
  }
};