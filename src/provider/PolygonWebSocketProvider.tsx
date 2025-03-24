// src/provider/PolygonWebSocketProvider.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { wsManager } from '../screens/services/polygonService';

// Context type
interface PolygonWebSocketContextProps {
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  connectionError: string | null;
}

// Create the context
const PolygonWebSocketContext = createContext<PolygonWebSocketContextProps>({
  isConnected: false,
  connect: async () => {},
  disconnect: () => {},
  connectionError: null,
});

// Hook for using the websocket context
export const usePolygonWebSocket = () => useContext(PolygonWebSocketContext);

// Provider component
export const PolygonWebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Connect to the WebSocket server - defined with useCallback to avoid recreation
  const connect = useCallback(async () => {
    try {
      await wsManager.connect();
    } catch (error) {
      console.error('Error connecting to Polygon WebSocket:', error);
      setConnectionError('Connection failed');
    }
  }, []);

  // Disconnect from the WebSocket server - defined with useCallback to avoid recreation
  const disconnect = useCallback(() => {
    wsManager.disconnect();
    setIsConnected(false);
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
      setIsConnected(true);
      setConnectionError(null);
    };

    const handleAuthFailed = (message: string) => {
      setIsConnected(false);
      setConnectionError(`Authentication failed: ${message}`);
    };

    const handleMaxReconnect = () => {
      setIsConnected(false);
      setConnectionError('Maximum reconnection attempts reached');
    };

    // Set up listeners
    wsManager.events.on('authenticated', handleAuthenticated);
    wsManager.events.on('auth_failed', handleAuthFailed);
    wsManager.events.on('max_reconnect_attempts', handleMaxReconnect);

    // Initial connection
    connect();

    // Clean up event listeners when component unmounts
    return () => {
      appStateSubscription.remove();
      wsManager.events.off('authenticated', handleAuthenticated);
      wsManager.events.off('auth_failed', handleAuthFailed);
      wsManager.events.off('max_reconnect_attempts', handleMaxReconnect);
      
      // Disconnect WebSocket when component unmounts
      disconnect();
    };
  }, [connect, disconnect, handleAppStateChange]);

  const contextValue: PolygonWebSocketContextProps = {
    isConnected,
    connect,
    disconnect,
    connectionError,
  };

  return (
    <PolygonWebSocketContext.Provider value={contextValue}>
      {children}
    </PolygonWebSocketContext.Provider>
  );
};

export default PolygonWebSocketProvider;