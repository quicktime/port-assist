import React, { useState } from "react";
import { View, ScrollView, Alert, KeyboardAvoidingView, StyleSheet, Platform, FlatList, TouchableOpacity } from "react-native";
import {
  Text,
  TextInput,
  Button,
  useTheme,
  ActivityIndicator,
  Chip,
  Divider,
  Surface,
  List
} from "react-native-paper";
import { addPortfolioItem, PortfolioItem } from "../../services/portfolio";
import { fetchStockPrice, searchStocks } from "../../services/polygon";
import { router } from "expo-router";
import { debounce } from 'lodash';
import { BaseScreen } from "../";
import { commonStyles, formStyles } from "../styles/common";

/**
 * Screen for adding a new stock to the portfolio
 */
export default function AddScreen() {
  const paperTheme = useTheme();
  
  const [symbol, setSymbol] = useState("");
  const [shares, setShares] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSymbol, setCheckingSymbol] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

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
    
    if (upperText.length >= 2) {
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

    const isValid = await validateSymbol();
    if (!isValid) return;

    setLoading(true);
    
    try {
      const portfolioItem: PortfolioItem = {
        symbol: symbol.toUpperCase(),
        shares: Number(shares),
        avg_price: Number(avgPrice),
        target_price: targetPrice ? Number(targetPrice) : undefined,
        notes
      };
      
      await addPortfolioItem(portfolioItem);
      Alert.alert("Success", "Stock added to portfolio", [
        { text: "OK", onPress: () => router.back() }
      ]);
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
    <BaseScreen
      title="Add Stock"
      showBackButton={true}
      onBack={() => router.back()}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={commonStyles.container}
      >
        <ScrollView style={commonStyles.container}>
          <View style={formStyles.formContainer}>
            <Text variant="bodyMedium" style={formStyles.label}>Symbol *</Text>
            <View style={styles.symbolRow}>
              <TextInput
                mode="outlined"
                placeholder="e.g., AAPL"
                value={symbol}
                autoCapitalize="characters"
                onChangeText={handleSymbolChange}
                style={styles.symbolInput}
              />
              <Button
                mode="contained"
                onPress={handleCheckSymbol}
                disabled={checkingSymbol || !symbol}
                loading={checkingSymbol}
                style={styles.checkButton}
              >
                Check
              </Button>
            </View>
            
            {/* Search results */}
            {searching && (
              <View style={styles.searchingContainer}>
                <ActivityIndicator size="small" />
                <Text style={styles.searchingText}>Searching...</Text>
              </View>
            )}
            
            {searchResults.length > 0 && (
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

            <Divider style={commonStyles.divider} />

            <Text variant="bodyMedium" style={formStyles.label}>Shares *</Text>
            <TextInput
              mode="outlined"
              placeholder="Number of shares"
              value={shares}
              onChangeText={setShares}
              keyboardType="decimal-pad"
              style={formStyles.input}
            />

            <Text variant="bodyMedium" style={formStyles.label}>Average Price *</Text>
            <TextInput
              mode="outlined"
              placeholder="Your average purchase price"
              value={avgPrice}
              onChangeText={setAvgPrice}
              keyboardType="decimal-pad"
              style={formStyles.input}
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

            <Text variant="bodyMedium" style={formStyles.label}>Target Price</Text>
            <TextInput
              mode="outlined"
              placeholder="Your target sell price (optional)"
              value={targetPrice}
              onChangeText={setTargetPrice}
              keyboardType="decimal-pad"
              style={formStyles.input}
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

            <Text variant="bodyMedium" style={formStyles.label}>Notes</Text>
            <TextInput
              mode="outlined"
              placeholder="Add any notes about this position"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              style={[formStyles.input, styles.notesInput]}
            />

            <Button
              mode="contained"
              onPress={handleSave}
              loading={loading}
              disabled={loading}
              style={commonStyles.button}
              icon="content-save"
            >
              {loading ? "Saving..." : "Add to Portfolio"}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
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
  calculatedContainer: {
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  notesInput: {
    minHeight: 100,
  }
});