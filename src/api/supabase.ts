// src/api/supabase.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_KEY } from "@env";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

export async function callSupabaseFunction(
  functionName: string, 
  endpoint: string, 
  method: 'GET' | 'POST' = 'GET', 
  body?: any
): Promise<any> {
  try {
    // Get auth token for Supabase Edge Function
    const { data: sessionData } = await supabase.auth.getSession();
    const authToken = sessionData.session?.access_token;
    
    if (!authToken) {
      throw new Error('No authentication token available');
    }
    
    const url = `${SUPABASE_URL}/functions/v1/${functionName}?${endpoint ? `endpoint=${encodeURIComponent(endpoint)}` : ''}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      ...(body && { body: JSON.stringify(body) })
    });
    
    if (!response.ok) {
      throw new Error(`Error calling Supabase function: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error calling Supabase function ${functionName}:`, error);
    throw error;
  }
}