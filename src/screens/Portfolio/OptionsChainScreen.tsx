import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, ScrollView, FlatList, TouchableOpacity, Alert, StyleSheet } from "react-native";
import {
  Appbar,
  Text,
  Button,
  Card,
  useTheme,
  ActivityIndicator,
  SegmentedButtons,
  DataTable,
  Menu,
  Searchbar,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  fetchOptionsData,
  fetchOptionsExpirations,
  fetchStockPrice,
  OptionData,
  StockData
} from "../services/polygonService";
import { usePolygonWebSocket } from "../../provider/PolygonWebSocketProvider";
import { useAppTheme } from "../../provider/ThemeProvider";
import { router } from "expo-router";

type OptionsChainScreenProps = {
  symbol: string;
};

export default function OptionsChainScreen({ symbol }: OptionsChainScreenProps) {
  const { isDarkMode, toggleTheme } = useAppTheme();
  const paperTheme = useTheme();
  const { subscribe, unsubscribe, isConnected } = usePolygonWebSocket();

  const [stockPrice, setStockPrice] = useState<number | null>(null);
  const [optionType, setOptionType] = useState<'call' | 'put'>('call');
  const [expirationDates, setExpirationDates] = useState<string[]>([]);
  const [selectedExpiration, setSelectedExpiration] = useState<string>('');
  const [options, setOptions] = useState<OptionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);

  // Refs for tracking subscriptions
  const stockSubscriptionRef = useRef<string | null>(null);
  const optionSubscriptionsRef = useRef<Map<string, string>>(new Map());
  const lastUpdateTimeRef = useRef<number>(0);
  const pendingUpdatesRef = useRef<any[]>([]);

  // Throttled update function
  const throttledUpdate = useCallback(() => {
    const now = Date.now();
    if (now - lastUpdateTimeRef.current >= 20000) { // 20 seconds
      // Apply all pending updates
      if (pendingUpdatesRef.current.length > 0) {
        setOptions(prevOptions =>
          prevOptions.map(opt => {
            const updates = pendingUpdatesRef.current
              .filter(update => update.ticker === opt.symbol)
              .reduce((acc, update) => ({
                ...acc,
                lastPrice: update.lastPrice || acc.lastPrice,
                bidPrice: update.bidPrice || acc.bidPrice,
                askPrice: update.askPrice || acc.askPrice,
                openInterest: update.openInterest || acc.openInterest
              }), opt);

            return updates;
          })
        );

        // Reset pending updates and update timestamp
        pendingUpdatesRef.current = [];
        lastUpdateTimeRef.current = now;
      }
    }
  }, []);

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
    // Handler for stock price updates
    const handleStockUpdate = (data: StockData) => {
      if (data.ticker === symbol) {
        setStockPrice(data.currentPrice);
      }
    };

    // Handler for option updates
    const handleOptionUpdate = (data: any) => {
      // Check if the update is for an option in our current set
      const matchingOption = options.find(opt => opt.symbol === data.ticker);
      if (matchingOption) {
        setOptions(prevOptions =>
          prevOptions.map(opt =>
            opt.symbol === data.ticker
              ? {
                ...opt,
                lastPrice: data.lastPrice || opt.lastPrice,
                bidPrice: data.bidPrice || opt.bidPrice,
                askPrice: data.askPrice || opt.askPrice,
                openInterest: data.openInterest || opt.openInterest
              }
              : opt
          )
        );
      }
    };

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
  }, [symbol, loadInitialData, unsubscribe, options]);

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

  // Render individual option item
  const renderOptionItem = ({ item }: { item: OptionData }) => {
    const inTheMoney = optionType === 'call'
      ? item.strikePrice < (stockPrice || 0)
      : item.strikePrice > (stockPrice || 0);

    return (
      <TouchableOpacity
        onPress={() => {
          // Navigate to option detail screen with option data
          router.push({
            pathname: '/(app)/option-detail',
            params: { option: JSON.stringify(item) }
          });
        }}
      >
        <DataTable.Row
          style={[
            styles.optionRow,
            inTheMoney && {
              backgroundColor: isDarkMode
                ? 'rgba(46, 125, 50, 0.2)'
                : 'rgba(46, 125, 50, 0.1)'
            }
          ]}
        >
          <DataTable.Cell>{item.strikePrice.toFixed(2)}</DataTable.Cell>
          <DataTable.Cell numeric>{item.lastPrice.toFixed(2)}</DataTable.Cell>
          <DataTable.Cell numeric>{item.openInterest}</DataTable.Cell>
          <DataTable.Cell numeric>{(item.impliedVolatility * 100).toFixed(1)}%</DataTable.Cell>
        </DataTable.Row>
      </TouchableOpacity>
    );
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title={`${symbol} Options`} />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={paperTheme.colors.primary} />
          <Text variant="bodyLarge" style={styles.loadingText}>Loading options data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Main render
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={`${symbol} Options`} />
        <Appbar.Action
          icon={isDarkMode ? "white-balance-sunny" : "moon-waning-crescent"}
          onPress={toggleTheme}
        />
      </Appbar.Header>

      <ScrollView style={styles.scrollView}>
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

            <DataTable>
              <DataTable.Header>
                <DataTable.Title>Strike</DataTable.Title>
                <DataTable.Title numeric>Last</DataTable.Title>
                <DataTable.Title numeric>OI</DataTable.Title>
                <DataTable.Title numeric>IV%</DataTable.Title>
              </DataTable.Header>

              {loadingOptions ? (
                <View style={styles.loadingOptionsContainer}>
                  <ActivityIndicator size="small" color={paperTheme.colors.primary} />
                  <Text style={styles.loadingOptionsText}>Loading options...</Text>
                </View>
              ) : filteredOptions.length > 0 ? (
                <FlatList
                  data={filteredOptions}
                  renderItem={renderOptionItem}
                  keyExtractor={(item) => item.symbol}
                  scrollEnabled={false}
                />
              ) : (
                <View style={styles.noOptionsContainer}>
                  <Text>No options available for this selection</Text>
                </View>
              )}
            </DataTable>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ... (styles remain the same as in the previous implementation)
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
  },
  overviewCard: {
    margin: 16,
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
    margin: 16,
    marginTop: 0,
    borderRadius: 8,
    marginBottom: 32,
  },
  searchBar: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  optionRow: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.12)',
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
  }
});