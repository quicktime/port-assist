// src/services/claude/types.ts

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