// src/components/WebSocketStatus.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Surface, useTheme, Chip, Tooltip } from 'react-native-paper';
import { usePolygonWebSocket } from '../hooks/usePolygonWebSocket';
import { ConnectionState } from '@/services';

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
  const { 
    connectionState, 
    isConnected,
    connect,
    disconnect
  } = usePolygonWebSocket({
    enabled: true
  });
  
  // In the new implementation, we don't have direct access to subscriptions
  // For now, we'll just show a placeholder - this would need to be implemented
  // in the underlying hook or service if needed
  const [subscriptions, setSubscriptions] = useState<string[]>([]);
  
  // Get status color based on connection state
  const getStatusColor = () => {
    if (isConnected) {
      return theme.colors.primary;
    } else if (connectionState === ConnectionState.CONNECTING || connectionState === ConnectionState.RECONNECTING) {
      return theme.colors.tertiary;
    } else {
      return theme.colors.error;
    }
  };
  
  // Get status text based on connection state
  const getStatusText = () => {
    if (isConnected) {
      return 'Connected';
    } else if (connectionState === ConnectionState.CONNECTING) {
      return 'Connecting...';
    } else if (connectionState === ConnectionState.RECONNECTING) {
      return 'Reconnecting...';
    } else if (connectionState === ConnectionState.ERROR) {
      return 'Error';
    } else {
      return 'Disconnected';
    }
  };
  
  // Handle manual connect
  const handleConnect = () => {
    connect();
    if (onConnect) onConnect();
  };
  
  // Handle manual disconnect
  const handleDisconnect = () => {
    disconnect();
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
                    !isConnected
                      ? theme.colors.primary
                      : theme.colors.surfaceDisabled
                }
              ]}
              onPress={handleConnect}
              disabled={isConnected}
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
                    isConnected
                      ? theme.colors.error
                      : theme.colors.surfaceDisabled
                }
              ]}
              onPress={handleDisconnect}
              disabled={!isConnected}
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