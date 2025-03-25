// src/hooks/usePolygonWebSocket.ts
import { useState, useEffect, useCallback } from 'react';
import { 
  polygonWebSocketService, 
  ConnectionState, 
  StockUpdateEvent,
  SubscriptionPriority
} from '../services/polygon';

interface UsePolygonWebSocketProps {
  symbols?: string[];
  priority?: SubscriptionPriority;
  enabled?: boolean;
  refreshInterval?: number;
}

interface UsePolygonWebSocketResult {
  stockData: Record<string, { price: number; timestamp: number }>;
  connectionState: ConnectionState;
  isConnected: boolean;
  subscribe: (symbol: string, priority?: SubscriptionPriority) => void;
  unsubscribe: (symbol: string) => void;
  connect: () => void;
  disconnect: () => void;
  refreshData: () => void;
  isLoading: boolean;
  lastUpdated: Date | null;
}

export const usePolygonWebSocket = ({
  symbols = [],
  priority = SubscriptionPriority.MEDIUM,
  enabled = true,
  refreshInterval = 0
}: UsePolygonWebSocketProps = {}): UsePolygonWebSocketResult => {
  const [stockData, setStockData] = useState<Record<string, { price: number; timestamp: number }>>(
    polygonWebSocketService.getStockData()
  );
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    polygonWebSocketService.getConnectionState()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Handle stock updates
  const handleStockUpdate = useCallback((update: StockUpdateEvent) => {
    setStockData(prev => ({
      ...prev,
      [update.symbol]: {
        price: update.price,
        timestamp: update.timestamp
      }
    }));
    
    setLastUpdated(new Date());
  }, []);
  
  // Handle connection state changes
  const handleConnectionStateChange = useCallback((state: ConnectionState) => {
    setConnectionState(state);
  }, []);
  
  // Subscribe to a symbol with a specific priority
  const subscribe = useCallback((symbol: string, symbolPriority = priority) => {
    polygonWebSocketService.subscribe(symbol, symbolPriority);
  }, [priority]);
  
  // Unsubscribe from a symbol
  const unsubscribe = useCallback((symbol: string) => {
    polygonWebSocketService.unsubscribe(symbol);
  }, []);
  
  // Connect manually
  const connect = useCallback(() => {
    polygonWebSocketService.connect();
  }, []);
  
  // Disconnect manually
  const disconnect = useCallback(() => {
    polygonWebSocketService.disconnect();
  }, []);
  
  // Force refresh data for the subscribed symbols
  const refreshData = useCallback(() => {
    setIsLoading(true);
    
    // Using a Promise.all to wait for all force refreshes
    const symbolsToRefresh = symbols.length > 0 ? symbols : Object.keys(stockData);
    
    Promise.all(
      symbolsToRefresh.map(symbol => {
        // Force an immediate update for the symbol
        polygonWebSocketService.forceUpdate(symbol);
        
        // Give it a little time to process
        return new Promise(resolve => setTimeout(resolve, 100));
      })
    ).finally(() => {
      // Update stockData with the latest data
      setStockData(polygonWebSocketService.getStockData());
      setLastUpdated(new Date());
      setIsLoading(false);
    });
  }, [symbols, stockData]);
  
  // Set up listeners and subscriptions on mount
  useEffect(() => {
    if (!enabled) return;
    
    // Add event listeners
    polygonWebSocketService.on('stockUpdate', handleStockUpdate);
    polygonWebSocketService.on('connectionStateChange', handleConnectionStateChange);
    
    // Subscribe to symbols if provided with the specified priority
    if (symbols.length > 0) {
      symbols.forEach(symbol => {
        polygonWebSocketService.subscribe(symbol, priority);
      });
    }
    
    // Connect if not already connected
    if (polygonWebSocketService.getConnectionState() === ConnectionState.DISCONNECTED) {
      polygonWebSocketService.connect();
    }
    
    // Set up refresh interval if specified
    let refreshTimer: NodeJS.Timeout | null = null;
    if (refreshInterval > 0) {
      refreshTimer = setInterval(() => {
        refreshData();
      }, refreshInterval);
    }
    
    // Cleanup on unmount
    return () => {
      polygonWebSocketService.off('stockUpdate', handleStockUpdate);
      polygonWebSocketService.off('connectionStateChange', handleConnectionStateChange);
      
      // Only unsubscribe from our symbols if the hook provided them
      if (symbols.length > 0) {
        symbols.forEach(symbol => {
          polygonWebSocketService.unsubscribe(symbol);
        });
      }
      
      // Clear refresh timer
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
    };
  }, [
    enabled, 
    symbols, 
    priority,
    refreshInterval,
    handleStockUpdate, 
    handleConnectionStateChange,
    refreshData
  ]);
  
  // Boolean for easy connection checking
  const isConnected = connectionState === ConnectionState.CONNECTED;
  
  return {
    stockData,
    connectionState,
    isConnected,
    subscribe,
    unsubscribe,
    connect,
    disconnect,
    refreshData,
    isLoading,
    lastUpdated
  };
};