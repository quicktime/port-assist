import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { wsManager } from '../screens/services/polygonService';

// Context type
interface PolygonWebSocketContextProps {
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  connectionError: string | null;
  subscribe: (channel: string, ticker: string) => void;
  unsubscribe: (channel: string, ticker: string) => void;
}

// Create the context
const PolygonWebSocketContext = createContext<PolygonWebSocketContextProps>({
  isConnected: false,
  connect: async () => {},
  disconnect: () => {},
  connectionError: null,
  subscribe: () => {},
  unsubscribe: () => {},
});

// Hook for using the websocket context
export const usePolygonWebSocket = () => useContext(PolygonWebSocketContext);

// Provider component
export const PolygonWebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Connect to the WebSocket server
  const connect = useCallback(async () => {
    try {
      // Reset previous error state
      setConnectionError(null);
      
      // Attempt connection
      await wsManager.connect();
      
      // Success will be handled by event listeners
    } catch (error) {
      console.error('Error connecting to Polygon WebSocket:', error);
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
    }
  }, []);

  // Disconnect from the WebSocket server
  const disconnect = useCallback(() => {
    wsManager.disconnect();
  }, []);

  // Subscribe to a channel and ticker
  const subscribe = useCallback((channel: string, ticker: string) => {
    wsManager.subscribe(channel, ticker);
  }, []);

  // Unsubscribe from a channel and ticker
  const unsubscribe = useCallback((channel: string, ticker: string) => {
    wsManager.unsubscribe(channel, ticker);
  }, []);

  // Handle app state changes (foreground/background)
  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // App has come to the foreground - reconnect WebSocket
      connect();
    } else if (nextAppState === 'background') {
      // App has gone to the background - disconnect WebSocket to save battery
      disconnect();
    }
  }, [connect, disconnect]);

  // Set up event listeners when the component mounts
  useEffect(() => {
    // Subscribe to app state changes
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // Event handler functions
    const handleAuthenticated = () => {
      console.log('Polygon WebSocket authenticated successfully');
      setIsConnected(true);
      setConnectionError(null);
    };

    const handleAuthFailed = (message: string) => {
      console.error('Polygon WebSocket authentication failed:', message);
      setIsConnected(false);
      setConnectionError(`Authentication failed: ${message}`);
    };

    const handleMaxReconnect = () => {
      console.error('Polygon WebSocket max reconnection attempts reached');
      setIsConnected(false);
      setConnectionError('Maximum reconnection attempts reached');
    };

    const handleConnectionError = (error: any) => {
      console.error('Polygon WebSocket connection error:', error);
      setIsConnected(false);
      setConnectionError(error instanceof Error ? error.message : 'Connection error');
    };

    // Set up listeners
    wsManager.events.on('authenticated', handleAuthenticated);
    wsManager.events.on('auth_failed', handleAuthFailed);
    wsManager.events.on('max_reconnect_attempts', handleMaxReconnect);
    wsManager.events.on('connection_error', handleConnectionError);

    // Initial connection
    connect();

    // Clean up event listeners when component unmounts
    return () => {
      appStateSubscription.remove();
      wsManager.events.off('authenticated', handleAuthenticated);
      wsManager.events.off('auth_failed', handleAuthFailed);
      wsManager.events.off('max_reconnect_attempts', handleMaxReconnect);
      wsManager.events.off('connection_error', handleConnectionError);
     
      // Disconnect WebSocket when component unmounts
      disconnect();
    };
  }, [connect, disconnect, handleAppStateChange]);

  const contextValue: PolygonWebSocketContextProps = {
    isConnected,
    connect,
    disconnect,
    connectionError,
    subscribe,
    unsubscribe,
  };

  return (
    <PolygonWebSocketContext.Provider value={contextValue}>
      {children}
    </PolygonWebSocketContext.Provider>
  );
};

export default PolygonWebSocketProvider;