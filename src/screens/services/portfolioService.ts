import { supabase } from '../../initSupabase';
import { fetchStockPrice } from './polygonService';

export interface PortfolioItem {
  id?: string;
  user_id?: string;
  symbol: string;
  shares: number;
  avg_price: number;
  current_price?: number;
  target_price?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  
  // Calculated fields (not stored in DB)
  value?: number;
  cost_basis?: number;
  profit_loss?: number;
  profit_loss_percent?: number;
}

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
    const { error } = await supabase
      .from('portfolio')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    console.error('Error deleting portfolio item:', error);
    throw error;
  }
};

// Get portfolio with current prices
export const getPortfolioWithCurrentPrices = async (): Promise<PortfolioItem[]> => {
  try {
    const portfolio = await getPortfolio();
    
    // Fetch current prices for all symbols
    const portfolioWithPrices = await Promise.all(
      portfolio.map(async (item) => {
        try {
          const stockData = await fetchStockPrice(item.symbol);
          
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
        } catch (error) {
          console.error(`Error fetching price for ${item.symbol}:`, error);
          // Return the item without current price data
          return item;
        }
      })
    );
    
    return portfolioWithPrices;
  } catch (error) {
    console.error('Error getting portfolio with prices:', error);
    throw error;
  }
};

// Get portfolio summary data
export const getPortfolioSummary = async () => {
  try {
    const portfolio = await getPortfolioWithCurrentPrices();
    
    const totalValue = portfolio.reduce((sum, item) => sum + (item.value || 0), 0);
    const totalCost = portfolio.reduce((sum, item) => sum + (item.cost_basis || 0), 0);
    const totalProfit = portfolio.reduce((sum, item) => sum + (item.profit_loss || 0), 0);
    const totalProfitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
    
    // Calculate allocation percentages
    const portfolioWithAllocation = portfolio.map(item => ({
      ...item,
      allocation: totalValue > 0 ? ((item.value || 0) / totalValue) * 100 : 0
    }));
    
    return {
      totalValue,
      totalCost,
      totalProfit,
      totalProfitPercent,
      items: portfolioWithAllocation
    };
  } catch (error) {
    console.error('Error getting portfolio summary:', error);
    throw error;
  }
};