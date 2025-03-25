// src/services/strategy/tradeStrategyService.ts
import { supabase } from '../../api/supabase';
import { TradeStrategyPreferences } from '../claude/types';

/**
 * Get the user's trade strategy preferences
 */
export const getTradeStrategy = async (): Promise<TradeStrategyPreferences> => {
  try {
    // Get the current user session
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    
    if (!userId) {
      throw new Error('No authenticated user found');
    }
    
    const { data, error } = await supabase
      .from('trade_strategy')
      .select('*')
      .eq('user_id', userId) // Only select the current user's strategy
      .maybeSingle(); // Use maybeSingle instead of single to avoid errors if no record found
    
    if (error) {
      throw new Error(error.message);
    }
    
    // If no data found, create default strategy
    if (!data) {
      return createDefaultTradeStrategy();
    }
    
    // Map snake_case DB fields to camelCase TypeScript fields
    return {
      riskTolerance: data.risk_tolerance,
      optionPreference: data.option_preference,
      expirationPreference: data.expiration_preference,
      strikePreference: data.strike_preference,
      maxTradePercentage: data.max_trade_percentage,
      stopLossPercentage: data.stop_loss_percentage,
      takeProfitPercentage: data.take_profit_percentage,
      preferredStrategies: data.preferred_strategies || [],
      technicalIndicators: data.technical_indicators || [],
      fundamentalFactors: data.fundamental_factors || []
    };
  } catch (error) {
    console.error('Error fetching trade strategy:', error);
    throw error;
  }
};

/**
 * Create a default trade strategy for the user
 */
export const createDefaultTradeStrategy = async (): Promise<TradeStrategyPreferences> => {
  try {
    // Get the current user session
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    
    if (!userId) {
      throw new Error('No authenticated user found');
    }
    
    const defaultStrategy: TradeStrategyPreferences = {
      riskTolerance: 'moderate',
      optionPreference: 'both',
      expirationPreference: 'monthly',
      strikePreference: 'ATM',
      maxTradePercentage: 5,
      stopLossPercentage: 10,
      takeProfitPercentage: 20,
      preferredStrategies: ['covered calls', 'cash secured puts'],
      technicalIndicators: ['RSI', 'MACD', 'Moving Averages'],
      fundamentalFactors: ['Earnings', 'Growth', 'Valuation']
    };
    
    const { error } = await supabase
      .from('trade_strategy')
      .insert({
        user_id: userId,
        risk_tolerance: defaultStrategy.riskTolerance,
        option_preference: defaultStrategy.optionPreference,
        expiration_preference: defaultStrategy.expirationPreference,
        strike_preference: defaultStrategy.strikePreference,
        max_trade_percentage: defaultStrategy.maxTradePercentage,
        stop_loss_percentage: defaultStrategy.stopLossPercentage,
        take_profit_percentage: defaultStrategy.takeProfitPercentage,
        preferred_strategies: defaultStrategy.preferredStrategies,
        technical_indicators: defaultStrategy.technicalIndicators,
        fundamental_factors: defaultStrategy.fundamentalFactors
      });
    
    if (error) {
      throw new Error(error.message);
    }
    
    return defaultStrategy;
  } catch (error) {
    console.error('Error creating default trade strategy:', error);
    throw error;
  }
};

/**
 * Update the user's trade strategy preferences
 */
export const updateTradeStrategy = async (strategy: TradeStrategyPreferences): Promise<TradeStrategyPreferences> => {
  try {
    // Get the current user session
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    
    if (!userId) {
      throw new Error('No authenticated user found');
    }
    
    // First check if a strategy exists for this user
    const { data: existingStrategy, error: checkError } = await supabase
      .from('trade_strategy')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (checkError) {
      throw new Error(checkError.message);
    }
    
    if (!existingStrategy) {
      // No existing strategy, create a new one
      return createTradeStrategy(strategy);
    }
    
    // Update existing strategy
    const { error } = await supabase
      .from('trade_strategy')
      .update({
        risk_tolerance: strategy.riskTolerance,
        option_preference: strategy.optionPreference,
        expiration_preference: strategy.expirationPreference,
        strike_preference: strategy.strikePreference,
        max_trade_percentage: strategy.maxTradePercentage,
        stop_loss_percentage: strategy.stopLossPercentage,
        take_profit_percentage: strategy.takeProfitPercentage,
        preferred_strategies: strategy.preferredStrategies,
        technical_indicators: strategy.technicalIndicators,
        fundamental_factors: strategy.fundamentalFactors
      })
      .eq('user_id', userId);
    
    if (error) {
      throw new Error(error.message);
    }
    
    return strategy;
  } catch (error) {
    console.error('Error updating trade strategy:', error);
    throw error;
  }
};

/**
 * Create a new trade strategy for the user
 */
export const createTradeStrategy = async (strategy: TradeStrategyPreferences): Promise<TradeStrategyPreferences> => {
  try {
    // Get the current user session
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    
    if (!userId) {
      throw new Error('No authenticated user found');
    }
    
    const { error } = await supabase
      .from('trade_strategy')
      .insert({
        user_id: userId,
        risk_tolerance: strategy.riskTolerance,
        option_preference: strategy.optionPreference,
        expiration_preference: strategy.expirationPreference,
        strike_preference: strategy.strikePreference,
        max_trade_percentage: strategy.maxTradePercentage,
        stop_loss_percentage: strategy.stopLossPercentage,
        take_profit_percentage: strategy.takeProfitPercentage,
        preferred_strategies: strategy.preferredStrategies,
        technical_indicators: strategy.technicalIndicators,
        fundamental_factors: strategy.fundamentalFactors
      });
    
    if (error) {
      throw new Error(error.message);
    }
    
    return strategy;
  } catch (error) {
    console.error('Error creating trade strategy:', error);
    throw error;
  }
};