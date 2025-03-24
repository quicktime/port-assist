import { supabase } from '../../initSupabase';
import { fetchStockPrice, subscribeToStockPrice } from './polygonService';

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

// Class for managing real-time portfolio data
export class PortfolioManager {
  private items: PortfolioItem[] = [];
  private subscriptions: Map<string, () => void> = new Map();
  private callbacks: Set<(items: PortfolioItem[]) => void> = new Set();
  
  constructor() {}
  
  // Initialize portfolio with data
  async initialize(): Promise<void> {
    try {
      const portfolio = await getPortfolio();
      this.items = portfolio;
      
      // Set up WebSocket subscriptions for each symbol
      for (const item of this.items) {
        this.subscribeToSymbol(item.symbol);
      }
      
      // Notify all callbacks with initial data
      this.notifyCallbacks();
    } catch (error) {
      console.error('Error initializing portfolio manager:', error);
      throw error;
    }
  }
  
  // Get all portfolio items
  getItems(): PortfolioItem[] {
    return [...this.items];
  }
  
  // Subscribe to updates for a symbol
  private subscribeToSymbol(symbol: string): void {
    // Unsubscribe existing subscription if any
    if (this.subscriptions.has(symbol)) {
      const unsubscribe = this.subscriptions.get(symbol);
      if (unsubscribe) unsubscribe();
      this.subscriptions.delete(symbol);
    }
    
    // Create new subscription
    subscribeToStockPrice(symbol, (stockData) => {
      // Find all items with this symbol and update them
      let updated = false;
      
      for (let i = 0; i < this.items.length; i++) {
        if (this.items[i].symbol === symbol) {
          const currentPrice = stockData.currentPrice;
          const shares = this.items[i].shares;
          const avg_price = this.items[i].avg_price;
          
          const value = currentPrice * shares;
          const cost_basis = avg_price * shares;
          const profit_loss = value - cost_basis;
          const profit_loss_percent = (profit_loss / cost_basis) * 100;
          
          this.items[i] = {
            ...this.items[i],
            current_price: currentPrice,
            value,
            cost_basis,
            profit_loss,
            profit_loss_percent
          };
          
          updated = true;
        }
      }
      
      // If any items were updated, notify callbacks
      if (updated) {
        this.notifyCallbacks();
      }
    }).then(unsubscribe => {
      this.subscriptions.set(symbol, unsubscribe);
    }).catch(error => {
      console.error(`Error subscribing to ${symbol}:`, error);
    });
  }
  
  // Remove a subscription
  private unsubscribeFromSymbol(symbol: string): void {
    if (this.subscriptions.has(symbol)) {
      const unsubscribe = this.subscriptions.get(symbol);
      if (unsubscribe) unsubscribe();
      this.subscriptions.delete(symbol);
    }
  }
  
  // Add a new portfolio item
  async addItem(item: PortfolioItem): Promise<void> {
    try {
      const newItem = await addPortfolioItem(item);
      this.items.push(newItem);
      this.subscribeToSymbol(newItem.symbol);
      this.notifyCallbacks();
    } catch (error) {
      console.error('Error adding portfolio item:', error);
      throw error;
    }
  }
  
  // Update a portfolio item
  async updateItem(item: PortfolioItem): Promise<void> {
    try {
      const updatedItem = await updatePortfolioItem(item);
      
      // Find and replace the item
      const index = this.items.findIndex(i => i.id === updatedItem.id);
      if (index !== -1) {
        // Check if symbol changed
        const oldSymbol = this.items[index].symbol;
        
        this.items[index] = updatedItem;
        
        // If symbol changed, update subscriptions
        if (oldSymbol !== updatedItem.symbol) {
          this.unsubscribeFromSymbol(oldSymbol);
          this.subscribeToSymbol(updatedItem.symbol);
        }
        
        this.notifyCallbacks();
      }
    } catch (error) {
      console.error('Error updating portfolio item:', error);
      throw error;
    }
  }
  
  // Delete a portfolio item
  async deleteItem(id: string): Promise<void> {
    try {
      // Find the item to get its symbol
      const index = this.items.findIndex(i => i.id === id);
      if (index !== -1) {
        const symbol = this.items[index].symbol;
        
        // Delete from DB
        await deletePortfolioItem(id);
        
        // Remove from local array
        this.items.splice(index, 1);
        
        // Check if we need to unsubscribe
        const hasOtherSymbol = this.items.some(i => i.symbol === symbol);
        if (!hasOtherSymbol) {
          this.unsubscribeFromSymbol(symbol);
        }
        
        this.notifyCallbacks();
      }
    } catch (error) {
      console.error('Error deleting portfolio item:', error);
      throw error;
    }
  }
  
  // Subscribe to portfolio updates
  subscribe(callback: (items: PortfolioItem[]) => void): () => void {
    this.callbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }
  
  // Notify all callbacks with current data
  private notifyCallbacks(): void {
    for (const callback of this.callbacks) {
      callback([...this.items]);
    }
  }
  
  // Refresh all data
  async refreshData(): Promise<void> {
    try {
      // Get fresh data from WebSockets
      for (const item of this.items) {
        this.unsubscribeFromSymbol(item.symbol);
        this.subscribeToSymbol(item.symbol);
      }
      
      this.notifyCallbacks();
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }
  
  // Get portfolio summary data
  getPortfolioSummary() {
    const totalValue = this.items.reduce((sum, item) => sum + (item.value || 0), 0);
    const totalCost = this.items.reduce((sum, item) => sum + (item.cost_basis || 0), 0);
    const totalProfit = this.items.reduce((sum, item) => sum + (item.profit_loss || 0), 0);
    const totalProfitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
    
    // Calculate allocation percentages
    const portfolioWithAllocation = this.items.map(item => ({
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
  }
  
  // Clean up all subscriptions
  cleanup(): void {
    for (const unsubscribe of this.subscriptions.values()) {
      unsubscribe();
    }
    this.subscriptions.clear();
    this.callbacks.clear();
  }
}

// Create singleton instance
const portfolioManager = new PortfolioManager();

// Export functions for backward compatibility
export const getPortfolioWithCurrentPrices = async (): Promise<PortfolioItem[]> => {
  try {
    // Initialize manager if needed
    if (portfolioManager.getItems().length === 0) {
      await portfolioManager.initialize();
    }
    
    return portfolioManager.getItems();
  } catch (error) {
    console.error('Error getting portfolio with prices:', error);
    throw error;
  }
};

export const getPortfolioSummary = async () => {
  try {
    // Initialize manager if needed
    if (portfolioManager.getItems().length === 0) {
      await portfolioManager.initialize();
    }
    
    return portfolioManager.getPortfolioSummary();
  } catch (error) {
    console.error('Error getting portfolio summary:', error);
    throw error;
  }
};

export { portfolioManager };