import React, { useState, useEffect } from "react";
import { View, ScrollView, Alert, KeyboardAvoidingView, StyleSheet, Platform, FlatList, TouchableOpacity } from "react-native";
import {
  Appbar,
  Text,
  TextInput,
  Button,
  useTheme,
  ActivityIndicator,
  Chip,
  Divider,
  Card,
  Surface,
  List
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { addPortfolioItem, updatePortfolioItem, PortfolioItem } from "../services/portfolioService";
import { fetchStockPrice, searchStocks } from "../services/polygonService";
import { useAppTheme } from "../../provider/ThemeProvider";
import { router, useLocalSearchParams } from "expo-router";
import { debounce } from 'lodash';

type AddEditStockProps = {
  mode: 'add' | 'edit';
  item?: PortfolioItem;
};

export default function AddEditStockScreen({ mode = 'add' }) {
  const params = useLocalSearchParams();
  const isEditMode = mode === 'edit' || params.mode === 'edit';
  let editItem: PortfolioItem | undefined;
  
  if (isEditMode && params.item) {
    try {
      editItem = JSON.parse(params.item as string) as PortfolioItem;
    } catch (error) {
      console.error("Error parsing portfolio item:", error);
    }
  }
  
  const { isDarkMode, toggleTheme } = useAppTheme();
  const paperTheme = useTheme();
  
  const [symbol, setSymbol] = useState(editItem?.symbol || "");
  const [shares, setShares] = useState(editItem?.shares?.toString() || "");
  const [avgPrice, setAvgPrice] = useState(editItem?.avg_price?.toString() || "");
  const [targetPrice, setTargetPrice] = useState(editItem?.target_price?.toString() || "");
  const [notes, setNotes] = useState(editItem?.notes || "");
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSymbol, setCheckingSymbol] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (isEditMode && editItem?.symbol) {
      fetchCurrentPrice(editItem.symbol);
    }
  }, [isEditMode, editItem]);

  // Fetch the current price using Polygon.io API
  const fetchCurrentPrice = async (stockSymbol: string) => {
    if (!stockSymbol) return;
    
    setCheckingSymbol(true);
    try {
      const stockData = await fetchStockPrice(stockSymbol);
      setCurrentPrice(stockData.currentPrice);
    } catch (error) {
      console.error("Error fetching stock price:", error);
      setCurrentPrice(null);
    } finally {
      setCheckingSymbol(false);
    }
  };

  // Validate the stock symbol
  const validateSymbol = async () => {
    if (!symbol) {
      Alert.alert("Error", "Please enter a stock symbol");
      return false;
    }
    
    try {
      await fetchCurrentPrice(symbol);
      if (currentPrice === null) {
        Alert.alert("Error", "Invalid stock symbol or unable to fetch price data");
        return false;
      }
      return true;
    } catch (error) {
      Alert.alert("Error", "Invalid stock symbol or unable to fetch price data");
      return false;
    }
  };

  // Handle check symbol button
  const handleCheckSymbol = async () => {
    if (!symbol) {
      Alert.alert("Error", "Please enter a stock symbol");
      return;
    }
    
    await fetchCurrentPrice(symbol);
  };
  
  // Search for stocks with debounce
  const debouncedSearch = debounce(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    
    try {
      const results = await searchStocks(query);
      setSearchResults(results);
    } catch (error) {
      console.error("Error searching stocks:", error);
    } finally {
      setSearching(false);
    }
  }, 500);
  
  // Handle symbol input change
  const handleSymbolChange = (text: string) => {
    const upperText = text.toUpperCase();
    setSymbol(upperText);
    
    if (!isEditMode && upperText.length >= 2) {
      setSearching(true);
      debouncedSearch(upperText);
    } else {
      setSearchResults([]);
    }
  };
  
  // Handle selecting a stock from search results
  const handleSelectStock = async (stock: any) => {
    setSymbol(stock.symbol);
    setSearchResults([]);
    await fetchCurrentPrice(stock.symbol);
  };

  // Handle save button
  const handleSave = async () => {
    if (!symbol || !shares || !avgPrice) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }
    
    if (isNaN(Number(shares)) || isNaN(Number(avgPrice)) ||
        (targetPrice && isNaN(Number(targetPrice)))) {
      Alert.alert("Error", "Shares, average price, and target price must be numbers");
      return;
    }

    // Validate the symbol if not in edit mode or if symbol has changed
    if (!isEditMode || (editItem && symbol !== editItem.symbol)) {
      const isValid = await validateSymbol();
      if (!isValid) return;
    }

    setLoading(true);
    
    try {
      const portfolioItem: PortfolioItem = {
        ...(editItem || {}),
        symbol: symbol.toUpperCase(),
        shares: Number(shares),
        avg_price: Number(avgPrice),
        target_price: targetPrice ? Number(targetPrice) : undefined,
        notes
      };
      
      if (isEditMode && editItem?.id) {
        await updatePortfolioItem(portfolioItem);
        Alert.alert("Success", "Stock updated successfully", [
          { text: "OK", onPress: () => router.back() }
        ]);
      } else {
        await addPortfolioItem(portfolioItem);
        Alert.alert("Success", "Stock added to portfolio", [
          { text: "OK", onPress: () => router.back() }
        ]);
      }
    } catch (error) {
      console.error("Error saving stock:", error);
      Alert.alert("Error", "Failed to save stock to portfolio");
    } finally {
      setLoading(false);
    }
  };
  
  // Render a search result item
  const renderSearchResultItem = ({ item }: { item: any }) => (
    <TouchableOpacity onPress={() => handleSelectStock(item)}>
      <List.Item
        title={item.symbol}
        description={item.name}
        left={props => <List.Icon {...props} icon="chart-line" />}
        right={props => <List.Icon {...props} icon="chevron-right" />}
      />
      <Divider />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={isEditMode ? "Edit Stock" : "Add Stock"} />
        <Appbar.Action 
          icon={isDarkMode ? "white-balance-sunny" : "moon-waning-crescent"} 
          onPress={toggleTheme} 
        />
      </Appbar.Header>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        <ScrollView style={styles.scrollView}>
          <View style={styles.formContainer}>
            <Text variant="bodyMedium" style={styles.label}>Symbol *</Text>
            <View style={styles.symbolRow}>
              <TextInput
                mode="outlined"
                placeholder="e.g., AAPL"
                value={symbol}
                autoCapitalize="characters"
                onChangeText={handleSymbolChange}
                disabled={isEditMode}
                style={styles.symbolInput}
              />
              {!isEditMode && (
                <Button
                  mode="contained"
                  onPress={handleCheckSymbol}
                  disabled={checkingSymbol || !symbol}
                  loading={checkingSymbol}
                  style={styles.checkButton}
                >
                  Check
                </Button>
              )}
            </View>
            
            {/* Search results */}
            {searching && (
              <View style={styles.searchingContainer}>
                <ActivityIndicator size="small" />
                <Text style={styles.searchingText}>Searching...</Text>
              </View>
            )}
            
            {searchResults.length > 0 && !isEditMode && (
              <Surface style={styles.searchResultsContainer} elevation={3}>
                <FlatList
                  data={searchResults}
                  renderItem={renderSearchResultItem}
                  keyExtractor={(item) => item.symbol}
                  style={styles.searchResults}
                  keyboardShouldPersistTaps="handled"
                  ListHeaderComponent={
                    <Text variant="bodySmall" style={styles.searchResultsHeader}>
                      Select a stock:
                    </Text>
                  }
                />
              </Surface>
            )}
            
            {currentPrice !== null && (
              <Chip 
                icon="check-circle" 
                style={styles.priceChip}
                textStyle={{ color: paperTheme.colors.onSurfaceVariant }}
              >
                Current price: ${currentPrice.toFixed(2)}
              </Chip>
            )}

            <Divider style={styles.divider} />

            <Text variant="bodyMedium" style={styles.label}>Shares *</Text>
            <TextInput
              mode="outlined"
              placeholder="Number of shares"
              value={shares}
              onChangeText={setShares}
              keyboardType="decimal-pad"
              style={styles.input}
            />

            <Text variant="bodyMedium" style={styles.label}>Average Price *</Text>
            <TextInput
              mode="outlined"
              placeholder="Your average purchase price"
              value={avgPrice}
              onChangeText={setAvgPrice}
              keyboardType="decimal-pad"
              style={styles.input}
              left={<TextInput.Affix text="$" />}
            />
            
            {/* Calculated cost basis */}
            {shares && avgPrice && !isNaN(Number(shares)) && !isNaN(Number(avgPrice)) && (
              <View style={styles.calculatedContainer}>
                <Text variant="bodySmall">
                  Cost Basis: ${(Number(shares) * Number(avgPrice)).toFixed(2)}
                </Text>
              </View>
            )}

            <Text variant="bodyMedium" style={styles.label}>Target Price</Text>
            <TextInput
              mode="outlined"
              placeholder="Your target sell price (optional)"
              value={targetPrice}
              onChangeText={setTargetPrice}
              keyboardType="decimal-pad"
              style={styles.input}
              left={<TextInput.Affix text="$" />}
            />

            {/* Potential return calculation */}
            {shares && avgPrice && targetPrice && 
             !isNaN(Number(shares)) && !isNaN(Number(avgPrice)) && !isNaN(Number(targetPrice)) && (
              <View style={styles.calculatedContainer}>
                <Text 
                  variant="bodySmall"
                  style={{
                    color: Number(targetPrice) > Number(avgPrice) 
                      ? paperTheme.colors.primary 
                      : paperTheme.colors.error
                  }}
                >
                  Potential Return: {(((Number(targetPrice) / Number(avgPrice)) - 1) * 100).toFixed(2)}%
                </Text>
              </View>
            )}

            <Text variant="bodyMedium" style={styles.label}>Notes</Text>
            <TextInput
              mode="outlined"
              placeholder="Add any notes about this position"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              style={[styles.input, styles.notesInput]}
            />

            <Button
              mode="contained"
              onPress={handleSave}
              loading={loading}
              disabled={loading}
              style={styles.saveButton}
              icon="content-save"
            >
              {loading ? "Saving..." : (isEditMode ? "Update Stock" : "Add to Portfolio")}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  label: {
    marginBottom: 8,
  },
  symbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  symbolInput: {
    flex: 1,
    marginRight: 10,
  },
  checkButton: {
    marginTop: 4, // Align better with TextInput
  },
  searchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  searchingText: {
    marginLeft: 8,
    opacity: 0.7,
  },
  searchResultsContainer: {
    marginTop: 8,
    borderRadius: 8,
    maxHeight: 250,
  },
  searchResults: {
    padding: 8,
  },
  searchResultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    opacity: 0.7,
  },
  priceChip: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  divider: {
    marginVertical: 16,
  },
  input: {
    marginBottom: 8,
  },
  calculatedContainer: {
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  notesInput: {
    marginBottom: 24,
    minHeight: 100,
  },
  saveButton: {
    marginBottom: 30,
    paddingVertical: 6,
  }
});