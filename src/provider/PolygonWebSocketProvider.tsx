import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { POLYGON_API_KEY } from '@env';
import { EventEmitter } from 'eventemitter3';

// WebSocket connection manager for Polygon.io
class PolygonWebSocketManager {
  private socket: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private MAX_RECONNECT_ATTEMPTS: number = 5;
  public events: EventEmitter = new EventEmitter();
  private subscriptions: Set<string> = new Set();

  constructor() {
    // Bind methods to maintain correct context
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
  }

  // Create WebSocket connection URL
  private getWebSocketUrl(): string {
    return `wss://socket.polygon.io/stocks`;
  }

  // Establish WebSocket connection
  async connect(): Promise<void> {
    // Prevent multiple connection attempts
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    // Reset reconnection attempts
    this.reconnectAttempts = 0;

    try {
      this.socket = new WebSocket(
        `${this.getWebSocketUrl()}?apiKey=${POLYGON_API_KEY}`
      );

      // Set up event listeners
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onerror = this.handleError.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  // Handle successful connection
  private handleOpen(): void {
    this.reconnectAttempts = 0;
    this.events.emit('authenticated');

    // Resubscribe to previous subscriptions
    this.subscriptions.forEach(channel => {
      this.socket?.send(JSON.stringify({ action: 'subscribe', params: channel }));
    });
  }

  // Handle incoming messages
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      // Emit different types of events based on message content
      switch (data.type) {
        case 'trade':
          this.events.emit('trade', data);
          break;
        case 'quote':
          this.events.emit('quote', data);
          break;
        case 'aggregate':
          this.events.emit('aggregate', data);
          break;
        default:
          console.log('Unhandled message type:', data);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  // Handle connection errors
  private handleError(error: Event): void {
    console.error('WebSocket error:', error);
    this.events.emit('connection_error', error);
  }

  // Handle connection close
  private handleClose(event: CloseEvent): void {
    if (!event.wasClean) {
      this.reconnect();
    }
  }

  // Handle connection error with custom error handling
  private handleConnectionError(error: any): void {
    console.error('WebSocket connection error:', error);
    this.events.emit('connection_error', error);
    this.reconnect();
  }

  // Attempt to reconnect
  private reconnect(): void {
    if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      const timeout = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      setTimeout(() => {
        this.connect();
      }, timeout);
    } else {
      this.events.emit('max_reconnect_attempts');
    }
  }

  // Disconnect from WebSocket
  disconnect(): void {
    if (this.socket) {
      // Unsubscribe from all channels before closing
      this.subscriptions.forEach(channel => {
        this.unsubscribe(channel);
      });

      this.socket.close();
      this.socket = null;
    }
  }

  // Subscribe to a specific channel
  subscribe(channel: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ 
        action: 'subscribe', 
        params: channel 
      }));
      this.subscriptions.add(channel);
    }
  }

  // Unsubscribe from a specific channel
  unsubscribe(channel: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ 
        action: 'unsubscribe', 
        params: channel 
      }));
      this.subscriptions.delete(channel);
    }
  }
}

// Singleton instance of WebSocket manager
export const wsManager = new PolygonWebSocketManager();

// Context type
interface PolygonWebSocketContextProps {
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  connectionError: string | null;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
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
    } catch (error) {
      console.error('Error connecting to Polygon WebSocket:', error);
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
    }
  }, []);

  // Disconnect from the WebSocket server
  const disconnect = useCallback(() => {
    wsManager.disconnect();
  }, []);

  // Subscribe to a channel
  const subscribe = useCallback((channel: string) => {
    wsManager.subscribe(channel);
  }, []);

  // Unsubscribe from a channel
  const unsubscribe = useCallback((channel: string) => {
    wsManager.unsubscribe(channel);
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