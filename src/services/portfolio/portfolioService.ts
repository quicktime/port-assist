// src/services/portfolio/portfolioService.ts
import { supabase } from '../../api/supabase';
import { PortfolioItem, PortfolioSummary } from './types';
import { 
  fetchStockPrice, 
  fetchStockPrices, 
  batchUpdatePortfolioPrices 
} from '../polygon';
import { polygonWebSocketService } from '../polygon';

// Fetch portfolio items for the current user
export const getPortfolio = async (): Promise<PortfolioItem[]> => {
  try {
    const { data, error } = await supabase
      .from('portfolio')
      .select('*')
      .order('symbol', { ascending: true });
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    throw error;
  }
};

// Add a new item to the portfolio
export const addPortfolioItem = async (item: PortfolioItem): Promise<PortfolioItem> => {
  try {
    const { data, error } = await supabase
      .from('portfolio')
      .insert([
        {
          symbol: item.symbol,
          shares: item.shares,
          avg_price: item.avg_price,
          target_price: item.target_price,
          notes: item.notes
        }
      ])
      .select();
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Subscribe to this symbol in WebSocket for real-time updates
    polygonWebSocketService.subscribe(item.symbol);
    
    return data?.[0] || item;
  } catch (error) {
    console.error('Error adding portfolio item:', error);
    throw error;
  }
};

// Update an existing portfolio item
export const updatePortfolioItem = async (item: PortfolioItem): Promise<PortfolioItem> => {
  try {
    const { data, error } = await supabase
      .from('portfolio')
      .update({
        shares: item.shares,
        avg_price: item.avg_price,
        target_price: item.target_price,
        notes: item.notes
      })
      .eq('id', item.id)
      .select();
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data?.[0] || item;
  } catch (error) {
    console.error('Error updating portfolio item:', error);
    throw error;
  }
};

// Delete a portfolio item
export const deletePortfolioItem = async (id: string): Promise<void> => {
  try {
    // Get the item first to unsubscribe from WebSocket
    const { data: item } = await supabase
      .from('portfolio')
      .select('symbol')
      .eq('id', id)
      .single();
    
    // Delete the item
    const { error } = await supabase
      .from('portfolio')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Get all remaining portfolio items
    const { data: remainingItems } = await supabase
      .from('portfolio')
      .select('symbol')
      .order('symbol');
    
    // Check if the symbol is still in use in other portfolio items
    if (item && remainingItems) {
      const symbolStillInUse = remainingItems.some(
        remainingItem => remainingItem.symbol === item.symbol
      );
      
      // Only unsubscribe if the symbol is no longer in the portfolio
      if (!symbolStillInUse) {
        polygonWebSocketService.unsubscribe(item.symbol);
      }
    }
  } catch (error) {
    console.error('Error deleting portfolio item:', error);
    throw error;
  }
};

// Get portfolio with current prices - with optimized batching
export const getPortfolioWithCurrentPrices = async (): Promise<PortfolioItem[]> => {
  try {
    const portfolio = await getPortfolio();
    
    if (portfolio.length === 0) {
      return [];
    }
    
    // Use the batch update function to get all prices at once
    return await batchUpdatePortfolioPrices(portfolio);
  } catch (error) {
    console.error('Error getting portfolio with prices:', error);
    throw error;
  }
};

// Get portfolio summary data
export const getPortfolioSummary = async (): Promise<PortfolioSummary> => {
  try {
    const portfolio = await getPortfolioWithCurrentPrices();
    const cashBalance = await getCashBalance();
    
    const totalValue = portfolio.reduce((sum, item) => sum + (item.value || 0), 0);
    const totalCost = portfolio.reduce((sum, item) => sum + (item.cost_basis || 0), 0);
    const totalProfit = portfolio.reduce((sum, item) => sum + (item.profit_loss || 0), 0);
    const totalProfitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
    
    // Calculate total portfolio value including cash
    const totalPortfolioValue = totalValue + cashBalance;
    
    // Calculate allocation percentages
    const portfolioWithAllocation = portfolio.map(item => ({
      ...item,
      allocation: totalPortfolioValue > 0 ? ((item.value || 0) / totalPortfolioValue) * 100 : 0
    }));
    
    return {
      totalValue,
      totalCost,
      totalProfit,
      totalProfitPercent,
      items: portfolioWithAllocation,
      cashBalance,
      cashAllocation: totalPortfolioValue > 0 ? (cashBalance / totalPortfolioValue) * 100 : 0,
      totalPortfolioValue
    };
  } catch (error) {
    console.error('Error getting portfolio summary:', error);
    throw error;
  }
};

// Get a specific portfolio item by ID
export const getPortfolioItemById = async (id: string): Promise<PortfolioItem | null> => {
  try {
    const { data, error } = await supabase
      .from('portfolio')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    if (!data) {
      return null;
    }
    
    // Get current price for the item
    try {
      const stockData = await fetchStockPrice(data.symbol);
      
      const currentPrice = stockData.currentPrice;
      const value = currentPrice * data.shares;
      const cost_basis = data.avg_price * data.shares;
      const profit_loss = value - cost_basis;
      const profit_loss_percent = (profit_loss / cost_basis) * 100;
      
      return {
        ...data,
        current_price: currentPrice,
        value,
        cost_basis,
        profit_loss,
        profit_loss_percent
      };
    } catch (error) {
      console.error(`Error fetching price for ${data.symbol}:`, error);
      // Return the item without current price data
      return data;
    }
  } catch (error) {
    console.error('Error fetching portfolio item:', error);
    throw error;
  }
};

// Get cash balance for the current user
export const getCashBalance = async (): Promise<number> => {
  try {
    // Get the current user's ID
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    
    if (!userId) {
      throw new Error('No authenticated user found');
    }
    
    const { data, error } = await supabase
      .from('cash_balance')
      .select('*')
      .eq('user_id', userId)  // Filter by the current user's ID
      .maybeSingle();
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data?.amount || 0;
  } catch (error) {
    console.error('Error fetching cash balance:', error);
    return 0;
  }
};

// Update cash balance
export const updateCashBalance = async (amount: number): Promise<void> => {
  try {
    // Get the current user's ID
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    
    if (!userId) {
      throw new Error('No authenticated user found');
    }
    
    const { data: existingBalance } = await supabase
      .from('cash_balance')
      .select('id')
      .eq('user_id', userId)  // Filter by the current user's ID
      .maybeSingle();
    
    if (existingBalance) {
      // Update existing record
      const { error } = await supabase
        .from('cash_balance')
        .update({ 
          amount, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', existingBalance.id);
      
      if (error) {
        throw new Error(error.message);
      }
    } else {
      // Create new record
      const { error } = await supabase
        .from('cash_balance')
        .insert([{ 
          amount,
          user_id: userId  // Include the user_id in the insert
        }]);
      
      if (error) {
        throw new Error(error.message);
      }
    }
  } catch (error) {
    console.error('Error updating cash balance:', error);
    throw error;
  }
};