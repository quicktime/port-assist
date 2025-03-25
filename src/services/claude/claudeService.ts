// src/services/claude/claudeService.ts
import { SUPABASE_URL } from '@env';
import { supabase } from '../../api/supabase';
import { PortfolioItem } from '../portfolio/types';
import { StockData, OptionData } from '../polygon/types';
import { 
  TradeStrategyPreferences,
  TradeRecommendationsResponse 
} from './types';

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
Weekly Options Trading Strategy
I've developed a comprehensive strategy that incorporates your existing positions, focuses on weekly options, and aims to build toward the wheel strategy as your capital grows.
Core Strategy Components:
1. Weekly Market Analysis (Every Monday Morning)

Use the first hour of trading to assess market sentiment for each stock
Evaluate technical indicators (RSI, MACD, moving averages)
Monitor pre-market news for any catalysts
Set up alerts for significant price moves during the day

2. Weekly Options Selection Criteria
For Bullish Outlook:
Buy weekly call options 2-4% above current price

For Bearish Outlook:
Buy weekly put options 1-3 points below current price

For Neutral or Uncertain Outlook:
Consider implementing straddles (both puts and calls at same strike)

3. Capital Allocation Rules

Allocate 50% of weekly options budget to HOOD (priority stock)
Allocate 25% each to RXRX and ACHR
Maintain at least 30% of portfolio in cash for option writing purposes
Never use margin as specified

4. Position Sizing Guidelines

Limit single option positions to 2-3% of total portfolio value
For straddles, limit to 4% of portfolio value
Add to positions only if initial option moves in favorable direction

5. Exit Strategies (Automated Conditions to Set)
For Long Calls:

Take profit at 25% gain (limit order)
Take profit at 50% gain on half position, let remainder run
Stop loss at 20% loss
Exit all positions by Thursday if not triggered (to avoid Friday expiration risk)

For Long Puts:

Take profit at 30% gain (limit order)
Stop loss at 25% loss
Exit all positions by Thursday if not triggered

For Straddles:

Take profit on call side at 40% gain if stock rises sharply
Take profit on put side at 40% gain if stock falls sharply
Exit entire straddle if combined value falls by 25%

6. Hedging Strategy for Stock Purchases
As you buy more shares:

RXRX: For every 25 additional shares purchased, buy 1 protective put 10% out-of-the-money with 30-45 days expiration
ACHR: For every 25 additional shares purchased, buy 1 protective put 10% out-of-the-money with 30-45 days expiration
HOOD: For every 15 additional shares purchased, buy 1 protective put 10% out-of-the-money with 30-45 days expiration

7. Priority Plan for Additional HOOD Shares

Use $777 monthly allocation primarily for HOOD purchases
Reinvest 40% of options profits into HOOD shares
Target accumulating 100 shares of HOOD
Once 100 shares are owned, begin implementing wheel strategy

Implementation of the Wheel Strategy (Once You Have 100 Shares)
Phase 1: Cash-Secured Puts

Sell weekly cash-secured puts at strikes 5-7% below current price
Collect premium and either get assigned shares (if price falls below strike) or keep premium (if price stays above strike)
Maintain enough cash to cover 100 shares at strike price

Phase 2: Covered Calls (After Assignment or With Your 100 Shares)

Sell weekly covered calls at strikes 4-6% above your cost basis
Collect premium and either have shares called away (if price rises above strike) or keep premium (if price stays below strike)

Phase 3: Repeat the Wheel

If shares are called away, go back to Phase 1
If shares are not called away, continue selling covered calls

Automatic Condition Settings
Set these conditions in your brokerage platform for execution during the trading day:

Morning Entry Orders (Set by 10:00 AM)

Based on market analysis, place limit orders for selected options
Set GTC (Good Till Canceled) with end date of current week


Take Profit Orders

Immediately after purchasing options, set limit orders at target profit percentages


Stop Loss Orders

Set stop market orders at specified loss percentages
For straddles, set conditional orders based on combined position value


Thursday Exit Orders

Set automatic sell orders for Thursday afternoon to exit any remaining positions



Weekly Schedule for 1-Hour Daily Management
Monday:

Perform market analysis
Make weekly strategy decisions
Place initial orders for options

Tuesday-Wednesday:

Monitor positions
Adjust stop losses if needed
Add to positions if appropriate based on market movement

Thursday:

Ensure all positions will be closed before Friday
Evaluate week's performance
Prepare for next week

Friday:

Avoid holding weekly options into expiration
Use time to research and plan for following week

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
      try {
        // Get stock data
        const stock = await import('../polygon').then(module => 
          module.fetchStockPrice(item.symbol)
        );
        stockData[item.symbol] = stock;
        
        // Get options data
        const options = await import('../polygon').then(module => 
          module.fetchOptionsData(item.symbol)
        );
        optionsData[item.symbol] = options;
      } catch (error) {
        console.error(`Error fetching data for ${item.symbol}:`, error);
        // Continue with next item if one fails
      }
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