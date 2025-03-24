// src/screens/Settings/WebSocketConfigScreen.tsx
import React, { useState, useEffect } from "react";
import { View, ScrollView, StyleSheet, Alert } from "react-native";
import {
  Appbar,
  Text,
  Card,
  Switch,
  Divider,
  List,
  Button,
  Dialog,
  Portal,
  RadioButton,
  useTheme
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../../provider/ThemeProvider";
import { polygonWebSocketService, ConnectionState } from "../services/polygonWebSocketService";
import WebSocketStatus from "../../components/WebSocketStatus";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

// Connection strategies
enum ConnectionStrategy {
  ALWAYS = 'always',
  MANUAL = 'manual',
  PORTFOLIO_ONLY = 'portfolio_only',
}

const WebSocketConfigScreen = () => {
  const { isDarkMode, toggleTheme } = useAppTheme();
  const theme = useTheme();
  
  // Settings state
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [showStatusIndicator, setShowStatusIndicator] = useState(true);
  const [connectionStrategy, setConnectionStrategy] = useState<ConnectionStrategy>(ConnectionStrategy.PORTFOLIO_ONLY);
  const [strategySelectorVisible, setStrategySelectorVisible] = useState(false);
  const [clearSubscriptionsDialogVisible, setClearSubscriptionsDialogVisible] = useState(false);
  
  // Load saved settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedAutoReconnect = await AsyncStorage.getItem('ws_auto_reconnect');
        const savedShowStatus = await AsyncStorage.getItem('ws_show_status');
        const savedStrategy = await AsyncStorage.getItem('ws_connection_strategy');
        
        if (savedAutoReconnect !== null) {
          setAutoReconnect(savedAutoReconnect === 'true');
        }
        
        if (savedShowStatus !== null) {
          setShowStatusIndicator(savedShowStatus === 'true');
        }
        
        if (savedStrategy !== null) {
          setConnectionStrategy(savedStrategy as ConnectionStrategy);
        }
      } catch (error) {
        console.error('Error loading WebSocket settings:', error);
      }
    };
    
    loadSettings();
  }, []);
  
  // Save settings when changed
  const saveSettings = async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error(`Error saving setting ${key}:`, error);
    }
  };
  
  // Handle toggle auto reconnect
  const handleToggleAutoReconnect = (value: boolean) => {
    setAutoReconnect(value);
    saveSettings('ws_auto_reconnect', value.toString());
    
    // Apply the setting to the WebSocket service
    // Note: This would require adding a method to the service to update this setting
    // polygonWebSocketService.setAutoReconnect(value);
  };
  
  // Handle toggle show status
  const handleToggleShowStatus = (value: boolean) => {
    setShowStatusIndicator(value);
    saveSettings('ws_show_status', value.toString());
  };
  
  // Handle change connection strategy
  const handleChangeStrategy = (value: ConnectionStrategy) => {
    setConnectionStrategy(value);
    saveSettings('ws_connection_strategy', value);
    setStrategySelectorVisible(false);
  };
  
  // Clear all subscriptions
  const handleClearSubscriptions = () => {
    try {
      // Get current subscriptions
      const subscriptions = polygonWebSocketService.getSubscriptions();
      
      // Unsubscribe from all symbols
      subscriptions.forEach(symbol => {
        polygonWebSocketService.unsubscribe(symbol);
      });
      
      setClearSubscriptionsDialogVisible(false);
      
      // Show confirmation
      Alert.alert(
        "Subscriptions Cleared",
        `Unsubscribed from ${subscriptions.length} symbols.`
      );
    } catch (error) {
      console.error("Error clearing subscriptions:", error);
      Alert.alert(
        "Error",
        "Failed to clear subscriptions. Please try again."
      );
    }
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="WebSocket Configuration" />
        <Appbar.Action 
          icon={isDarkMode ? "white-balance-sunny" : "moon-waning-crescent"} 
          onPress={toggleTheme} 
        />
      </Appbar.Header>
      
      <ScrollView style={styles.scrollView}>
        <WebSocketStatus showDetails={true} />
        
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Connection Settings</Text>
            
            <List.Item
              title="Connection Strategy"
              description={getStrategyDescription(connectionStrategy)}
              onPress={() => setStrategySelectorVisible(true)}
              right={() => (
                <List.Icon icon="chevron-right" />
              )}
            />
            
            <Divider />
            
            <List.Item
              title="Auto Reconnect"
              description="Automatically reconnect when connection is lost"
              right={() => (
                <Switch
                  value={autoReconnect}
                  onValueChange={handleToggleAutoReconnect}
                />
              )}
            />
            
            <Divider />
            
            <List.Item
              title="Show Status Indicator"
              description="Display connection status in app header"
              right={() => (
                <Switch
                  value={showStatusIndicator}
                  onValueChange={handleToggleShowStatus}
                />
              )}
            />
          </Card.Content>
        </Card>
        
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Subscription Management</Text>
            
            <Text variant="bodyMedium" style={styles.description}>
              WebSocket subscriptions are automatically managed based on your portfolio.
              You can manually clear all subscriptions if needed.
            </Text>
            
            <Button
              mode="outlined"
              onPress={() => setClearSubscriptionsDialogVisible(true)}
              style={styles.button}
              icon="delete-sweep"
            >
              Clear All Subscriptions
            </Button>
          </Card.Content>
        </Card>
        
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Performance Impact</Text>
            
            <Text variant="bodyMedium" style={styles.description}>
              WebSocket connections provide real-time data updates but can impact battery life and data usage.
              For optimal performance, we recommend using the "Portfolio Only" connection strategy.
            </Text>
            
            <List.Item
              title="Low Battery Usage"
              description="WebSocket optimized for minimal power consumption"
              left={props => <List.Icon {...props} icon="battery-check" />}
            />
            
            <List.Item
              title="Data Efficient"
              description="Only subscribes to symbols in your portfolio"
              left={props => <List.Icon {...props} icon="database-check" />}
            />
          </Card.Content>
        </Card>
      </ScrollView>
      
      {/* Connection Strategy Selector Dialog */}
      <Portal>
        <Dialog
          visible={strategySelectorVisible}
          onDismiss={() => setStrategySelectorVisible(false)}
        >
          <Dialog.Title>Connection Strategy</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group
              onValueChange={(value) => handleChangeStrategy(value as ConnectionStrategy)}
              value={connectionStrategy}
            >
              <RadioButton.Item
                label="Always Connect"
                value={ConnectionStrategy.ALWAYS}
              />
              <RadioButton.Item
                label="Portfolio Only"
                value={ConnectionStrategy.PORTFOLIO_ONLY}
              />
              <RadioButton.Item
                label="Manual Connection"
                value={ConnectionStrategy.MANUAL}
              />
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setStrategySelectorVisible(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Clear Subscriptions Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={clearSubscriptionsDialogVisible}
          onDismiss={() => setClearSubscriptionsDialogVisible(false)}
        >
          <Dialog.Title>Clear All Subscriptions</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Are you sure you want to clear all WebSocket subscriptions?
              You will stop receiving real-time updates until you revisit the portfolio screen.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setClearSubscriptionsDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleClearSubscriptions}>Clear</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

// Helper function to get description of connection strategy
const getStrategyDescription = (strategy: ConnectionStrategy): string => {
  switch (strategy) {
    case ConnectionStrategy.ALWAYS:
      return 'Always keep WebSocket connected';
    case ConnectionStrategy.MANUAL:
      return 'Only connect when manually initiated';
    case ConnectionStrategy.PORTFOLIO_ONLY:
      return 'Connect only when viewing portfolio';
    default:
      return '';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  description: {
    marginBottom: 16,
    opacity: 0.7,
  },
  button: {
    marginTop: 8,
  },
});

export default WebSocketConfigScreen;