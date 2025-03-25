// src/services/contribution/types.ts

export interface Contribution {
  id?: string;
  user_id?: string;
  amount: number;
  date: string;
  status: 'completed' | 'upcoming';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ContributionSummary {
  totalContributed: number;
  totalRemaining: number;
  completedCount: number;
  upcomingCount: number;
  nextDate: string | null;
  nextAmount: number | null;
}