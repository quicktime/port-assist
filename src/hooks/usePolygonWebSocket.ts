// src/hooks/usePolygonWebSocket.ts
import { useState, useEffect, useCallback } from 'react';
import { 
  polygonWebSocketService, 
  ConnectionState, 
  StockUpdateEvent 
} from '../screens/services/polygonWebSocketService';

interface UsePolygonWebSocketProps {
  symbols?: string[];
  enabled?: boolean;
}

interface UsePolygonWebSocketResult {
  stockData: Record<string, { price: number; timestamp: number }>;
  connectionState: ConnectionState;
  isConnected: boolean;
  subscribe: (symbol: string) => void;
  unsubscribe: (symbol: string) => void;
  connect: () => void;
  disconnect: () => void;
}

export const usePolygonWebSocket = ({
  symbols = [],
  enabled = true
}: UsePolygonWebSocketProps = {}): UsePolygonWebSocketResult => {
  const [stockData, setStockData] = useState<Record<string, { price: number; timestamp: number }>>(
    polygonWebSocketService.getStockData()
  );
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    polygonWebSocketService.getConnectionState()
  );
  
  // Handle stock updates
  const handleStockUpdate = useCallback((update: StockUpdateEvent) => {
    setStockData(prev => ({
      ...prev,
      [update.symbol]: {
        price: update.price,
        timestamp: update.timestamp
      }
    }));
  }, []);
  
  // Handle connection state changes
  const handleConnectionStateChange = useCallback((state: ConnectionState) => {
    setConnectionState(state);
  }, []);
  
  // Subscribe to a symbol
  const subscribe = useCallback((symbol: string) => {
    polygonWebSocketService.subscribe(symbol);
  }, []);
  
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
  
  // Set up listeners and subscriptions on mount
  useEffect(() => {
    if (!enabled) return;
    
    // Add event listeners
    polygonWebSocketService.on('stockUpdate', handleStockUpdate);
    polygonWebSocketService.on('connectionStateChange', handleConnectionStateChange);
    
    // Subscribe to symbols if provided
    if (symbols.length > 0) {
      symbols.forEach(symbol => {
        polygonWebSocketService.subscribe(symbol);
      });
    }
    
    // Connect if not already connected
    if (polygonWebSocketService.getConnectionState() === ConnectionState.DISCONNECTED) {
      polygonWebSocketService.connect();
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
    };
  }, [enabled, symbols, handleStockUpdate, handleConnectionStateChange]);
  
  // Boolean for easy connection checking
  const isConnected = connectionState === ConnectionState.CONNECTED;
  
  return {
    stockData,
    connectionState,
    isConnected,
    subscribe,
    unsubscribe,
    connect,
    disconnect
  };
};