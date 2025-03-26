import React, { useState, useEffect } from "react";
import { View, ScrollView, Alert, KeyboardAvoidingView, StyleSheet, Platform } from "react-native";
import {
  Text,
  TextInput,
  Button,
  useTheme,
  Chip,
  Divider,
} from "react-native-paper";
import { updatePortfolioItem, PortfolioItem } from "../../services/portfolio";
import { fetchStockPrice } from "../../services/polygon";
import { router, useLocalSearchParams } from "expo-router";
import { BaseScreen, LoadingScreen } from "../";
import { commonStyles, formStyles } from "../styles/common";

/**
 * Screen for editing an existing stock in the portfolio
 */
export default function EditScreen() {
  const params = useLocalSearchParams();
  const paperTheme = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<PortfolioItem | undefined>(undefined);
  const [symbol, setSymbol] = useState("");
  const [shares, setShares] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [checkingSymbol, setCheckingSymbol] = useState(false);

  useEffect(() => {
    if (params.item) {
      try {
        const item = JSON.parse(params.item as string) as PortfolioItem;
        setEditItem(item);
        setSymbol(item.symbol || "");
        setShares(item.shares?.toString() || "");
        setAvgPrice(item.avg_price?.toString() || "");
        setTargetPrice(item.target_price?.toString() || "");
        setNotes(item.notes || "");
        
        if (item.symbol) {
          fetchCurrentPrice(item.symbol);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error parsing portfolio item:", error);
        Alert.alert("Error", "Failed to load stock data");
        router.back();
      }
    } else {
      Alert.alert("Error", "No stock selected to edit");
      router.back();
    }
  }, [params.item]);

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

    setSaving(true);
    
    try {
      const portfolioItem: PortfolioItem = {
        ...(editItem || {}),
        symbol: symbol.toUpperCase(),
        shares: Number(shares),
        avg_price: Number(avgPrice),
        target_price: targetPrice ? Number(targetPrice) : undefined,
        notes
      };
      
      await updatePortfolioItem(portfolioItem);
      Alert.alert("Success", "Stock updated successfully", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error("Error updating stock:", error);
      Alert.alert("Error", "Failed to update stock in portfolio");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading stock data..." />;
  }

  return (
    <BaseScreen
      title="Edit Stock"
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
            <TextInput
              mode="outlined"
              value={symbol}
              disabled={true}
              style={formStyles.input}
            />
            
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
              loading={saving}
              disabled={saving}
              style={commonStyles.button}
              icon="content-save"
            >
              {saving ? "Saving..." : "Update Stock"}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
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