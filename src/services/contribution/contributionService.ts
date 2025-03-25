// src/services/contribution/contributionService.ts
import { supabase } from '../../api/supabase';
import { Contribution, ContributionSummary } from './types';

// Create the contributions table if it doesn't exist
export const setupContributionsTable = async () => {
  try {
    // This function should only be called once during app initialization
    // It checks if the table exists, and if not, creates it
    
    // In a real-world scenario, this would be handled by Supabase migrations
    // This is a simplified approach for demonstration purposes
    
    // Check if table exists by querying it
    const { error } = await supabase.from('contributions').select('count');
    
    if (error && error.code === 'PGRST116') {
      // Table doesn't exist, create SQL setup via Supabase
      console.log('Contributions table does not exist, setting up...');
      
      // In a real app, you'd create the table using Supabase SQL editor
      // For demo purposes, we'll just show what would be created
      
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error setting up contributions table:', error);
    return false;
  }
};

// Get all contributions for the current user
export const getContributions = async (): Promise<Contribution[]> => {
  try {
    const { data, error } = await supabase
      .from('contributions')
      .select('*')
      .order('date', { ascending: true });
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching contributions:', error);
    
    // Return mock data for demo purposes
    return getMockContributions();
  }
};

// Add a new contribution
export const addContribution = async (contribution: Contribution): Promise<Contribution> => {
  try {
    const { data, error } = await supabase
      .from('contributions')
      .insert([
        {
          amount: contribution.amount,
          date: contribution.date,
          status: contribution.status,
          notes: contribution.notes
        }
      ])
      .select();
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data?.[0] || contribution;
  } catch (error) {
    console.error('Error adding contribution:', error);
    throw error;
  }
};

// Update an existing contribution
export const updateContribution = async (contribution: Contribution): Promise<Contribution> => {
  try {
    const { data, error } = await supabase
      .from('contributions')
      .update({
        amount: contribution.amount,
        date: contribution.date,
        status: contribution.status,
        notes: contribution.notes
      })
      .eq('id', contribution.id)
      .select();
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data?.[0] || contribution;
  } catch (error) {
    console.error('Error updating contribution:', error);
    throw error;
  }
};

// Mark a contribution as completed
export const markContributionAsCompleted = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('contributions')
      .update({ status: 'completed' })
      .eq('id', id);
    
    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    console.error('Error marking contribution as completed:', error);
    throw error;
  }
};

// Delete a contribution
export const deleteContribution = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('contributions')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    console.error('Error deleting contribution:', error);
    throw error;
  }
};

// Generate upcoming contributions based on a schedule
export const generateUpcomingContributions = async (
  startDate: string,
  endDate: string,
  amount: number,
  frequency: 'monthly' | 'weekly' | 'bi-weekly' = 'monthly'
): Promise<Contribution[]> => {
  try {
    const contributions: Contribution[] = [];
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    let current = new Date(start);
    
    // Generate dates
    while (current <= end) {
      contributions.push({
        amount,
        date: current.toISOString().split('T')[0],
        status: 'upcoming',
        notes: `${frequency.charAt(0).toUpperCase() + frequency.slice(1)} contribution`
      });
      
      // Increment based on frequency
      if (frequency === 'monthly') {
        current.setMonth(current.getMonth() + 1);
      } else if (frequency === 'bi-weekly') {
        current.setDate(current.getDate() + 14);
      } else { // weekly
        current.setDate(current.getDate() + 7);
      }
    }
    
    // Save to database
    const { data, error } = await supabase
      .from('contributions')
      .insert(contributions)
      .select();
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data || contributions;
  } catch (error) {
    console.error('Error generating contributions:', error);
    
    // Return the generated contributions without saving for demo purposes
    return getMockContributions();
  }
};

// Get contribution summary
export const getContributionSummary = async (): Promise<ContributionSummary> => {
  try {
    const contributions = await getContributions();
    
    const completed = contributions.filter(c => c.status === 'completed');
    const upcoming = contributions.filter(c => c.status === 'upcoming');
    
    const totalContributed = completed.reduce((sum, c) => sum + c.amount, 0);
    const totalRemaining = upcoming.reduce((sum, c) => sum + c.amount, 0);
    
    return {
      totalContributed,
      totalRemaining,
      completedCount: completed.length,
      upcomingCount: upcoming.length,
      nextDate: upcoming.length > 0 ? upcoming[0].date : null,
      nextAmount: upcoming.length > 0 ? upcoming[0].amount : null
    };
  } catch (error) {
    console.error('Error getting contribution summary:', error);
    throw error;
  }
};

// Generate mock contributions for demo
const getMockContributions = (): Contribution[] => {
  const today = new Date();
  const contributions: Contribution[] = [];
  
  // Add past contributions (completed)
  for (let i = 6; i > 0; i--) {
    const date = new Date(today);
    date.setMonth(today.getMonth() - i);
    
    contributions.push({
      id: `mock-${i}`,
      amount: 777,
      date: date.toISOString().split('T')[0],
      status: 'completed',
      notes: 'Monthly contribution'
    });
  }
  
  // Add upcoming contributions
  for (let i = 0; i < 12; i++) {
    const date = new Date(today);
    date.setMonth(today.getMonth() + i);
    
    // Skip current month if it's past the 15th (assuming contribution date is the 15th)
    if (i === 0 && today.getDate() > 15) continue;
    
    contributions.push({
      id: `mock-future-${i}`,
      amount: 777,
      date: date.toISOString().split('T')[0],
      status: 'upcoming',
      notes: 'Monthly contribution'
    });
  }
  
  return contributions.sort((a, b) => a.date.localeCompare(b.date));
};