declare module '@env' {
    export const SUPABASE_URL: string;
    export const SUPABASE_KEY: string;
    export const ALPHA_VANTAGE_API_KEY: string; // For Alpha Vantage API
    export const FINNHUB_API_KEY: string; // For Finnhub API
    export const POLYGON_API_KEY: string; // For Polygon API (if used)
    // Add other environment variables as needed
  }