// src/services/polygon/webSocketService.ts
import PolygonWebSocketManager from './webSocketManager';
import { ConnectionState, Market, StockUpdateEvent, OptionUpdateEvent } from './types';

// Define subscription priorities
export enum SubscriptionPriority {
  CRITICAL = 0,    // User is actively viewing (real-time)
  HIGH = 1,        // In user's portfolio (every 5s)
  MEDIUM = 2,      // In watchlist (every 15s)
  LOW = 3,         // Options chains, background data (every 30s)
  PAUSED = 4       // App in background or unused symbols (paused)
}

// Create and export a singleton instance
export const polygonWebSocketService = new PolygonWebSocketManager();

// Helper function to make REST API calls through the polygon-proxy Edge Function
export async function makePolygonRequest(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: any): Promise<any> {
  return await polygonWebSocketService.makePolygonRequest(endpoint, method, body);
}

// Export types and constants
export {
  ConnectionState,
  Market,
  StockUpdateEvent,
  OptionUpdateEvent
};