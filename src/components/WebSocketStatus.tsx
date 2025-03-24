// src/components/WebSocketStatus.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Surface, useTheme, Chip, Tooltip } from 'react-native-paper';
import { polygonWebSocketService, ConnectionState } from '../screens/services/polygonWebSocketService';

interface WebSocketStatusProps {
  showDetails?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

const WebSocketStatus: React.FC<WebSocketStatusProps> = ({ 
  showDetails = false,
  onConnect,
  onDisconnect
}) => {
  const theme = useTheme();
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    polygonWebSocketService.getConnectionState()
  );
  const [subscriptions, setSubscriptions] = useState<string[]>([]);
  
  useEffect(() => {
    // Handle connection state changes
    const handleConnectionStateChange = (state: ConnectionState) => {
      setConnectionState(state);
    };
    
    // Update subscriptions periodically
    const updateSubscriptions = () => {
      try {
        setSubscriptions(polygonWebSocketService.getSubscriptions());
      } catch (error) {
        console.error("Error getting subscriptions:", error);
      }
    };
    
    const interval = setInterval(updateSubscriptions, 5000);
    
    // Add event listener
    polygonWebSocketService.on('connectionStateChange', handleConnectionStateChange);
    
    // Initial subscriptions
    updateSubscriptions();
    
    // Cleanup
    return () => {
      try {
        polygonWebSocketService.off('connectionStateChange', handleConnectionStateChange);
        clearInterval(interval);
      } catch (error) {
        console.error("Error cleaning up WebSocketStatus component:", error);
      }
    };
  }, []);
  
  // Get status color based on connection state
  const getStatusColor = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return theme.colors.primary;
      case ConnectionState.CONNECTING:
      case ConnectionState.RECONNECTING:
        return theme.colors.tertiary;
      case ConnectionState.ERROR:
        return theme.colors.error;
      case ConnectionState.DISCONNECTED:
      default:
        return theme.colors.error;
    }
  };
  
  // Get status text based on connection state
  const getStatusText = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return 'Connected';
      case ConnectionState.CONNECTING:
        return 'Connecting...';
      case ConnectionState.RECONNECTING:
        return 'Reconnecting...';
      case ConnectionState.ERROR:
        return 'Error';
      case ConnectionState.DISCONNECTED:
      default:
        return 'Disconnected';
    }
  };
  
  // Handle manual connect
  const handleConnect = () => {
    polygonWebSocketService.connect();
    if (onConnect) onConnect();
  };
  
  // Handle manual disconnect
  const handleDisconnect = () => {
    polygonWebSocketService.disconnect();
    if (onDisconnect) onDisconnect();
  };
  
  return (
    <Surface style={styles.container} elevation={1}>
      <View style={styles.statusRow}>
        <Tooltip title={getStatusText()}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
        </Tooltip>
        <Text variant="bodyMedium">Polygon Data Feed</Text>
        <Text variant="bodyMedium" style={{ color: getStatusColor() }}>
          {getStatusText()}
        </Text>
      </View>
      
      {showDetails && (
        <>
          <View style={styles.buttonRow}>
            <Pressable
              style={[
                styles.button,
                { 
                  backgroundColor: 
                    connectionState === ConnectionState.DISCONNECTED
                      ? theme.colors.primary
                      : theme.colors.surfaceDisabled
                }
              ]}
              onPress={handleConnect}
              disabled={connectionState !== ConnectionState.DISCONNECTED}
            >
              <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>
                Connect
              </Text>
            </Pressable>
            
            <Pressable
              style={[
                styles.button,
                { 
                  backgroundColor: 
                    connectionState === ConnectionState.CONNECTED
                      ? theme.colors.error
                      : theme.colors.surfaceDisabled
                }
              ]}
              onPress={handleDisconnect}
              disabled={connectionState !== ConnectionState.CONNECTED}
            >
              <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>
                Disconnect
              </Text>
            </Pressable>
          </View>
          
          <View style={styles.subscriptionsContainer}>
            <Text variant="labelMedium">Active Subscriptions ({subscriptions.length})</Text>
            <View style={styles.chipContainer}>
              {subscriptions.slice(0, 5).map((symbol) => (
                <Chip key={symbol} style={styles.chip}>{symbol}</Chip>
              ))}
              
              {subscriptions.length > 5 && (
                <Chip style={styles.chip}>+{subscriptions.length - 5} more</Chip>
              )}
              
              {subscriptions.length === 0 && (
                <Text variant="bodySmall" style={styles.noSubscriptions}>
                  No active subscriptions
                </Text>
              )}
            </View>
          </View>
        </>
      )}
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    marginVertical: 8,
    borderRadius: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  buttonText: {
    fontWeight: 'bold',
  },
  subscriptionsContainer: {
    marginTop: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  chip: {
    margin: 2,
  },
  noSubscriptions: {
    fontStyle: 'italic',
    opacity: 0.7,
  }
});

export default WebSocketStatus;