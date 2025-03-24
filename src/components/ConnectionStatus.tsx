// src/components/ConnectionStatus.tsx
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Platform } from 'react-native';
import { Text, useTheme, Surface, IconButton } from 'react-native-paper';
import { usePolygonWebSocket } from '../provider/PolygonWebSocketProvider';

interface ConnectionStatusProps {
  autoHide?: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ autoHide = true }) => {
  const theme = useTheme();
  const { isConnected, connectionError, connect } = usePolygonWebSocket();
  const [visible, setVisible] = useState(true);
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Reset visibility and opacity when connection status changes
    setVisible(true);
    fadeAnim.setValue(1);

    // Auto-hide after 5 seconds if connected and autoHide is true
    if (isConnected && autoHide) {
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: Platform.OS !== 'web', // useNativeDriver not fully supported on web
        }).start(() => {
          setVisible(false);
        });
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isConnected, connectionError, autoHide, fadeAnim]);

  // Don't render anything if not visible
  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim },
      ]}
    >
      <Surface
        style={[
          styles.statusBar,
          {
            backgroundColor: isConnected
              ? theme.colors.primaryContainer
              : connectionError
                ? theme.colors.errorContainer
                : theme.colors.surfaceVariant,
          },
        ]}
      >
        <View style={styles.statusContent}>
          <View style={styles.statusIcon}>
            {isConnected ? (
              <IconButton
                icon="check-circle"
                iconColor={theme.colors.primary}
                size={20}
              />
            ) : connectionError ? (
              <IconButton
                icon="alert-circle"
                iconColor={theme.colors.error}
                size={20}
              />
            ) : (
              <IconButton
                icon="sync"
                iconColor={theme.colors.onSurfaceVariant}
                size={20}
                animated={true}
              />
            )}
          </View>
          <Text
            variant="bodyMedium"
            style={[
              styles.statusText,
              {
                color: isConnected
                  ? theme.colors.primary
                  : connectionError
                    ? theme.colors.error
                    : theme.colors.onSurfaceVariant,
              },
            ]}
          >
            {isConnected
              ? 'Connected to market data'
              : connectionError
                ? connectionError
                : 'Connecting to market data...'}
          </Text>
          {!isConnected && connectionError && (
            <IconButton
              icon="refresh"
              size={20}
              onPress={() => connect()}
              style={styles.retryButton}
            />
          )}
        </View>
      </Surface>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  statusBar: {
    margin: 8,
    borderRadius: 8,
    elevation: 4,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  statusIcon: {
    marginRight: -8,
  },
  statusText: {
    flex: 1,
  },
  retryButton: {
    marginLeft: 8,
  },
});

export default ConnectionStatus;