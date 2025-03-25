// src/services/portfolio/types.ts

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
  allocation?: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalProfit: number;
  totalProfitPercent: number;
  items: PortfolioItem[];
  cashBalance: number;
  cashAllocation: number;
  totalPortfolioValue: number;
}