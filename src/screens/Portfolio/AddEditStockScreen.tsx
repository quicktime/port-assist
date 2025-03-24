// src/screens/Portfolio/AddEditStockScreen.tsx
import React, { useState, useEffect } from "react";
import { View, ScrollView, Alert, KeyboardAvoidingView, StyleSheet, Platform } from "react-native";
import {
  Appbar,
  Text,
  TextInput,
  Button,
  useTheme,
  ActivityIndicator,
  Chip,
  Divider,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { addPortfolioItem, updatePortfolioItem, PortfolioItem } from "../services/portfolioService";
import { fetchStockPrice } from "../services/polygonService";
import { useAppTheme } from "../../provider/ThemeProvider";
import { router } from "expo-router";

type AddEditStockProps = {
  mode: 'add' | 'edit';
  item?: PortfolioItem;
};

export default function AddEditStockScreen({ mode, item }: AddEditStockProps) {
  const { isDarkMode, toggleTheme } = useAppTheme();
  const paperTheme = useTheme();
  const isEditMode = mode === 'edit';
  const editItem = isEditMode ? item : undefined;
  
  const [symbol, setSymbol] = useState(editItem?.symbol || "");
  const [shares, setShares] = useState(editItem?.shares.toString() || "");
  const [avgPrice, setAvgPrice] = useState(editItem?.avg_price.toString() || "");
  const [targetPrice, setTargetPrice] = useState(editItem?.target_price?.toString() || "");
  const [notes, setNotes] = useState(editItem?.notes || "");
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSymbol, setCheckingSymbol] = useState(false);

  useEffect(() => {
    if (isEditMode && editItem?.symbol) {
      fetchCurrentPrice(editItem.symbol);
    }
  }, [isEditMode, editItem]);

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

  const handleCheckSymbol = async () => {
    if (!symbol) {
      Alert.alert("Error", "Please enter a stock symbol");
      return;
    }
    
    await fetchCurrentPrice(symbol);
  };

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
                onChangeText={setSymbol}
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
  priceChip: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  divider: {
    marginVertical: 16,
  },
  input: {
    marginBottom: 16,
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