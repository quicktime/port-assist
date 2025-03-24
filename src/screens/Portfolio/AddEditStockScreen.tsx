import React, { useState, useEffect } from "react";
import { View, ScrollView, Alert, KeyboardAvoidingView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Layout,
  Text,
  TopNav,
  TextInput,
  Button,
  themeColor,
  useTheme,
} from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";
import { addPortfolioItem, updatePortfolioItem, PortfolioItem } from "../services/portfolioService";
import { fetchStockPrice } from "../services/polygonService";
import { MainStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<MainStackParamList, "AddStock" | "EditStock">;

export default function AddEditStockScreen({ route, navigation }: Props) {
  const { isDarkmode, setTheme } = useTheme();
  const isEditMode = route.name === "EditStock";
  const editItem = isEditMode ? (route.params as { item: PortfolioItem }).item : undefined;
  
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
          { text: "OK", onPress: () => navigation.goBack() }
        ]);
      } else {
        await addPortfolioItem(portfolioItem);
        Alert.alert("Success", "Stock added to portfolio", [
          { text: "OK", onPress: () => navigation.goBack() }
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
    <KeyboardAvoidingView behavior="height" style={{ flex: 1 }}>
      <Layout>
        <TopNav
          middleContent={isEditMode ? "Edit Stock" : "Add Stock"}
          leftContent={
            <Ionicons
              name="chevron-back"
              size={20}
              color={isDarkmode ? themeColor.white100 : themeColor.dark}
            />
          }
          leftAction={() => navigation.goBack()}
          rightContent={
            <Ionicons
              name={isDarkmode ? "sunny" : "moon"}
              size={20}
              color={isDarkmode ? themeColor.white100 : themeColor.dark}
            />
          }
          rightAction={() => {
            if (isDarkmode) {
              setTheme("light");
            } else {
              setTheme("dark");
            }
          }}
        />

        <ScrollView style={{ flex: 1, padding: 20 }}>
          <View style={{ marginBottom: 20 }}>
            <Text style={{ marginBottom: 10 }}>Symbol *</Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TextInput
                containerStyle={{ flex: 1, marginRight: 10 }}
                placeholder="e.g., AAPL"
                value={symbol}
                autoCapitalize="characters"
                onChangeText={setSymbol}
                editable={!isEditMode}
              />
              {!isEditMode && (
                <Button
                  text={checkingSymbol ? "..." : "Check"}
                  status="info"
                  size="sm"
                  onPress={handleCheckSymbol}
                  disabled={checkingSymbol || !symbol}
                />
              )}
            </View>
            {currentPrice !== null && (
              <Text
                style={{
                  marginTop: 5,
                  color: isDarkmode ? themeColor.success : "green",
                }}
              >
                Current price: ${currentPrice.toFixed(2)}
              </Text>
            )}
          </View>

          <View style={{ marginBottom: 20 }}>
            <Text style={{ marginBottom: 10 }}>Shares *</Text>
            <TextInput
              placeholder="Number of shares"
              value={shares}
              onChangeText={setShares}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={{ marginBottom: 20 }}>
            <Text style={{ marginBottom: 10 }}>Average Price *</Text>
            <TextInput
              placeholder="Your average purchase price"
              value={avgPrice}
              onChangeText={setAvgPrice}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={{ marginBottom: 20 }}>
            <Text style={{ marginBottom: 10 }}>Target Price</Text>
            <TextInput
              placeholder="Your target sell price (optional)"
              value={targetPrice}
              onChangeText={setTargetPrice}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={{ marginBottom: 30 }}>
            <Text style={{ marginBottom: 10 }}>Notes</Text>
            <TextInput
              placeholder="Add any notes about this position"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <Button
            text={loading ? "Saving..." : (isEditMode ? "Update Stock" : "Add to Portfolio")}
            onPress={handleSave}
            disabled={loading}
          />
        </ScrollView>
      </Layout>
    </KeyboardAvoidingView>
  );
}