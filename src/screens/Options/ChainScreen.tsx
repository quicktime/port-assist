import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, ScrollView, FlatList, TouchableOpacity, Alert, StyleSheet } from "react-native";
import {
  Text,
  Button,
  Card,
  useTheme,
  ActivityIndicator,
  SegmentedButtons,
  Menu,
  Searchbar,
} from "react-native-paper";
import { router, useLocalSearchParams } from "expo-router";
import {
  fetchOptionsData,
  fetchOptionsExpirations,
  fetchStockPrice,
  OptionData,
} from "../../services/polygon";
import { usePolygonWebSocket } from "../../provider/PolygonWebSocketProvider";
import { BaseScreen, LoadingScreen } from "../";
import { commonStyles } from "../styles/common";

/**
 * Screen for displaying the options chain for a specific underlying symbol
 */
export default function ChainScreen() {
  const params = useLocalSearchParams();
  const paperTheme = useTheme();
  const { subscribe, unsubscribe, isConnected } = usePolygonWebSocket();
  const symbol = params.symbol as string;
  
  const [stockPrice, setStockPrice] = useState<number | null>(null);
  const [optionType, setOptionType] = useState<'call' | 'put'>('call');
  const [expirationDates, setExpirationDates] = useState<string[]>([]);
  const [selectedExpiration, setSelectedExpiration] = useState<string>('');
  const [options, setOptions] = useState<OptionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);

  // Refs for tracking subscriptions and updates
  const stockSubscriptionRef = useRef<string | null>(null);
  const optionSubscriptionsRef = useRef<Map<string, string>>(new Map());
  const updateQueueRef = useRef<{[key: string]: Partial<OptionData>}>({});
  const lastUpdateTimeRef = useRef<number>(0);

  // Batch update function with 30-second throttling
  const processPendingUpdates = useCallback(() => {
    const currentTime = Date.now();
    const updates = updateQueueRef.current;

    // Only update if 30 seconds have passed since the last update
    if (currentTime - lastUpdateTimeRef.current >= 30000 && Object.keys(updates).length > 0) {
      setOptions(prevOptions => 
        prevOptions.map(opt => {
          const update = updates[opt.symbol];
          if (update) {
            return {
              ...opt,
              ...(update.lastPrice !== undefined && { lastPrice: update.lastPrice }),
              ...(update.bidPrice !== undefined && { bidPrice: update.bidPrice }),
              ...(update.askPrice !== undefined && { askPrice: update.askPrice }),
              ...(update.openInterest !== undefined && { openInterest: update.openInterest })
            };
          }
          return opt;
        })
      );

      // Update the last update time
      lastUpdateTimeRef.current = currentTime;

      // Clear the update queue
      updateQueueRef.current = {};
    }
  }, []);

  // Queue update with 30-second throttling
  const queueUpdate = useCallback((ticker: string, updateData: Partial<OptionData>) => {
    const currentTime = Date.now();

    // Always add to queue for potential future update
    updateQueueRef.current[ticker] = {
      ...updateQueueRef.current[ticker],
      ...updateData
    };

    // If 30 seconds have passed, process updates immediately
    if (currentTime - lastUpdateTimeRef.current >= 30000) {
      processPendingUpdates();
    }
  }, [processPendingUpdates]);

  // Load initial data and set up subscriptions
  const loadInitialData = useCallback(async () => {
    try {
      // Fetch initial stock price
      const stockData = await fetchStockPrice(symbol);
      setStockPrice(stockData.currentPrice);

      // Subscribe to stock price updates
      if (isConnected) {
        const subscriptionChannel = `Q.${symbol}`;
        subscribe(subscriptionChannel);
        stockSubscriptionRef.current = subscriptionChannel;
      }

      // Fetch available expiration dates
      const dates = await fetchOptionsExpirations(symbol);
      setExpirationDates(dates);

      if (dates.length > 0) {
        setSelectedExpiration(dates[0]);
        await loadOptionsData(dates[0]);
      }
    } catch (error) {
      console.error("Error loading options data:", error);
      Alert.alert("Error", "Failed to load options data");
    } finally {
      setLoading(false);
    }
  }, [symbol, isConnected, subscribe]);

  // Load options data and set up real-time subscriptions
  const loadOptionsData = useCallback(async (expDate: string) => {
    setLoadingOptions(true);

    // Clear existing option subscriptions
    optionSubscriptionsRef.current.forEach((channel) => {
      unsubscribe(channel);
    });
    optionSubscriptionsRef.current.clear();

    try {
      const optionsData = await fetchOptionsData(symbol, expDate);
      setOptions(optionsData);

      // Set up subscriptions for each option
      if (isConnected) {
        optionsData.forEach((option) => {
          const subscriptionChannel = `Q.${option.symbol}`;
          subscribe(subscriptionChannel);
          optionSubscriptionsRef.current.set(option.symbol, subscriptionChannel);
        });
      }
    } catch (error) {
      console.error("Error loading options chain:", error);
      Alert.alert("Error", "Failed to load options chain");
    } finally {
      setLoadingOptions(false);
    }
  }, [symbol, isConnected, subscribe, unsubscribe]);

  // Set up WebSocket event listeners
  useEffect(() => {
    // Initial data load
    loadInitialData();

    // Cleanup function
    return () => {
      // Unsubscribe from stock price channel
      if (stockSubscriptionRef.current) {
        unsubscribe(stockSubscriptionRef.current);
        stockSubscriptionRef.current = null;
      }

      // Unsubscribe from all option channels
      optionSubscriptionsRef.current.forEach((channel) => {
        unsubscribe(channel);
      });
      optionSubscriptionsRef.current.clear();
    };
  }, [symbol, loadInitialData, unsubscribe]);

  // Handle expiration date change
  const handleExpirationChange = async (expDate: string) => {
    setSelectedExpiration(expDate);
    await loadOptionsData(expDate);
  };

  // Filter and sort options
  const filteredOptions = options.filter(option =>
    option.optionType === optionType &&
    (filterText === '' ||
      option.strikePrice.toString().includes(filterText) ||
      option.openInterest.toString().includes(filterText))
  ).sort((a, b) => a.strikePrice - b.strikePrice);

  // Helper function to format Greek values
  const formatGreekValue = (value: number) => {
    return value.toFixed(4);
  };

  // Loading state
  if (loading) {
    return (
      <LoadingScreen message="Loading options data..." />
    );
  }

  // Main render
  return (
    <BaseScreen
      title={`${symbol} Options`}
      showBackButton={true}
      onBack={() => router.back()}
    >
      <ScrollView style={commonStyles.content}>
        <Card style={styles.overviewCard}>
          <Card.Content>
            <View style={styles.overviewHeader}>
              <Text variant="headlineMedium">{symbol}</Text>
              <Text variant="headlineMedium">${stockPrice?.toFixed(2) || "N/A"}</Text>
            </View>

            <View style={styles.expirationContainer}>
              <Text variant="bodyMedium" style={styles.label}>Expiration Date</Text>

              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setMenuVisible(true)}
                    icon="calendar"
                    style={styles.expirationButton}
                  >
                    {selectedExpiration || "Select date"}
                  </Button>
                }
                style={styles.expirationMenu}
              >
                <ScrollView style={styles.expirationMenuScroll}>
                  {expirationDates.map(date => (
                    <Menu.Item
                      key={date}
                      onPress={() => {
                        handleExpirationChange(date);
                        setMenuVisible(false);
                      }}
                      title={date}
                    />
                  ))}
                </ScrollView>
              </Menu>
            </View>

            <SegmentedButtons
              value={optionType}
              onValueChange={(value) => setOptionType(value as 'call' | 'put')}
              buttons={[
                { value: 'call', label: 'Calls' },
                { value: 'put', label: 'Puts' }
              ]}
              style={styles.segmentedButtons}
            />
          </Card.Content>
        </Card>

        <Card style={styles.optionsCard}>
          <Card.Content>
            <Searchbar
              placeholder="Filter by strike price"
              onChangeText={setFilterText}
              value={filterText}
              style={styles.searchBar}
            />

            <View style={styles.tableContainer}>
              {/* Fixed header row */}
              <View style={styles.tableHeader}>
                <View style={[styles.headerCell, styles.strikeCell]}>
                  <Text style={styles.headerText}>Strike</Text>
                </View>
                <View style={[styles.headerCell, styles.numericCell]}>
                  <Text style={styles.headerText}>Premium</Text>
                </View>
                <View style={[styles.headerCell, styles.numericCell]}>
                  <Text style={styles.headerText}>Delta</Text>
                </View>
                <View style={[styles.headerCell, styles.numericCell]}>
                  <Text style={styles.headerText}>Gamma</Text>
                </View>
                <View style={[styles.headerCell, styles.numericCell]}>
                  <Text style={styles.headerText}>Theta</Text>
                </View>
                <View style={[styles.headerCell, styles.numericCell]}>
                  <Text style={styles.headerText}>Vega</Text>
                </View>
                <View style={[styles.headerCell, styles.numericCell]}>
                  <Text style={styles.headerText}>OI</Text>
                </View>
                <View style={[styles.headerCell, styles.numericCell]}>
                  <Text style={styles.headerText}>IV%</Text>
                </View>
              </View>

              {/* Content area with scrolling */}
              {loadingOptions ? (
                <View style={styles.loadingOptionsContainer}>
                  <ActivityIndicator size="small" color={paperTheme.colors.primary} />
                  <Text style={styles.loadingOptionsText}>Loading options...</Text>
                </View>
              ) : filteredOptions.length > 0 ? (
                <FlatList
                  data={filteredOptions}
                  renderItem={({ item }) => {
                    // Determine if strike price is above or below current stock price
                    const isAboveStrike = item.strikePrice > (stockPrice || 0);
                    const isBelowStrike = item.strikePrice < (stockPrice || 0);
                    const isAtStrike = !isAboveStrike && !isBelowStrike;
                    
                    // Select row color based on strike price comparison
                    const rowColor = optionType === 'call'
                      ? (isBelowStrike ? paperTheme.colors.primary : isAboveStrike ? paperTheme.colors.error : 'transparent')
                      : (isAboveStrike ? paperTheme.colors.primary : isBelowStrike ? paperTheme.colors.error : 'transparent');
                    
                    return (
                      <TouchableOpacity
                        onPress={() => {
                          // Navigate to option detail screen with option data
                          router.push({
                            pathname: '/(app)/options/detail',
                            params: { option: JSON.stringify(item) }
                          });
                        }}
                      >
                        <View style={[
                          styles.rowContainer,
                          { backgroundColor: rowColor ? `${rowColor}20` : undefined } // 20 is hex for 12% opacity
                        ]}>
                          <View style={[styles.rowCell, styles.strikeCell]}>
                            <Text style={styles.rowText}>{item.strikePrice.toFixed(2)}</Text>
                          </View>
                          <View style={[styles.rowCell, styles.numericCell]}>
                            <Text style={styles.rowText}>{item.lastPrice.toFixed(2)}</Text>
                          </View>
                          <View style={[styles.rowCell, styles.numericCell]}>
                            <Text style={styles.rowText}>{formatGreekValue(item.greeks.delta)}</Text>
                          </View>
                          <View style={[styles.rowCell, styles.numericCell]}>
                            <Text style={styles.rowText}>{formatGreekValue(item.greeks.gamma)}</Text>
                          </View>
                          <View style={[styles.rowCell, styles.numericCell]}>
                            <Text style={styles.rowText}>{formatGreekValue(item.greeks.theta)}</Text>
                          </View>
                          <View style={[styles.rowCell, styles.numericCell]}>
                            <Text style={styles.rowText}>{formatGreekValue(item.greeks.vega)}</Text>
                          </View>
                          <View style={[styles.rowCell, styles.numericCell]}>
                            <Text style={styles.rowText}>{item.openInterest}</Text>
                          </View>
                          <View style={[styles.rowCell, styles.numericCell]}>
                            <Text style={styles.rowText}>{(item.impliedVolatility * 100).toFixed(1)}%</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                  keyExtractor={(item) => item.symbol}
                  style={styles.flatList}
                  showsVerticalScrollIndicator={true}
                />
              ) : (
                <View style={styles.noOptionsContainer}>
                  <Text>No options available for this selection</Text>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  tableContainer: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.12)',
    zIndex: 1, // Ensure header stays on top
  },
  headerCell: {
    padding: 12,
    justifyContent: 'center',
  },
  headerText: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  strikeCell: {
    width: 80,
  },
  numericCell: {
    width: 70,
    alignItems: 'flex-end',
  },
  flatList: {
    maxHeight: 300, // Limit height to force scrolling
  },
  rowContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  rowCell: {
    padding: 12,
    justifyContent: 'center',
  },
  rowText: {
    textAlign: 'right', // Right-align all numeric text
  },
  loadingOptionsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingOptionsText: {
    marginTop: 10,
  },
  noOptionsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  overviewCard: {
    marginVertical: 8,
    borderRadius: 8,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  expirationContainer: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
  },
  expirationButton: {
    width: '100%',
  },
  expirationMenu: {
    width: '80%',
  },
  expirationMenuScroll: {
    maxHeight: 300,
  },
  segmentedButtons: {
    marginTop: 8,
  },
  optionsCard: {
    marginVertical: 8,
    borderRadius: 8,
    marginBottom: 32,
  },
  searchBar: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
});