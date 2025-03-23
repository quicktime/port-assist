import React, { useState, useEffect, useRef } from "react";
import { 
  View, 
  Linking, 
  ScrollView, 
  Alert, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableOpacity, 
  FlatList,
  Modal
} from "react-native";
import { MainStackParamList } from "../types/navigation";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { supabase } from "../initSupabase";
import {
  Layout,
  Button,
  Text,
  TopNav,
  Section,
  SectionContent,
  useTheme,
  themeColor,
  TextInput,
} from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";
import { fetchStockSymbolSuggestions, fetchStockPriceFinnhub } from "../screens/utils/StockApis";

// Define the stock interfaces
interface StockEntry {
  id: string;
  symbol: string;
  shares: number;
  avgPrice: number;
  currentPrice: number | null;
  targetPrice: number | null;
  notes: string;
}

interface StockSuggestion {
  symbol: string;
  name: string;
}

export default function ({
  navigation,
}: NativeStackScreenProps<MainStackParamList, "MainTabs">) {
  const { isDarkmode, setTheme } = useTheme();
  const [portfolioItems, setPortfolioItems] = useState<StockEntry[]>([]);
  
  // For adding new items
  const [newSymbol, setNewSymbol] = useState("");
  const [newShares, setNewShares] = useState("");
  const [newAvgPrice, setNewAvgPrice] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // For stock symbol suggestions
  const [suggestions, setSuggestions] = useState<StockSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Fetch portfolio data on load
  useEffect(() => {
    fetchPortfolio();
  }, []);

  // Function to fetch portfolio from Supabase
  const fetchPortfolio = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("portfolio")
        .select("*")
        .order("symbol", { ascending: true });
      
      if (error) throw error;
      
      if (data) {
        // Update stock prices before setting the state
        const updatedItems = await Promise.all(
          data.map(async (item) => {
            try {
              // Get current price from API
              const priceData = await fetchStockPrice(item.symbol);
              return {
                ...item,
                currentPrice: priceData.currentPrice,
                targetPrice: priceData.targetPrice
              };
            } catch (err) {
              console.error(`Failed to fetch price for ${item.symbol}:`, err);
              return item;
            }
          })
        );
        
        setPortfolioItems(updatedItems);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle stock symbol input with debouncing
  const handleSymbolInput = (text: string) => {
    setNewSymbol(text);
    
    // Clear any existing timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    // Set a new timeout to delay the API call until typing stops
    searchTimeout.current = setTimeout(async () => {
      // Don't fetch if the text is empty
      if (!text.trim()) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      
      try {
        const results = await fetchStockSymbolSuggestions(text);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch (error) {
        console.error('Error handling symbol input:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 500); // 500ms delay
  };

  // Function to select a suggestion
  const selectSuggestion = (suggestion: StockSuggestion) => {
    setNewSymbol(suggestion.symbol);
    setShowSuggestions(false);
  };

  // Function to fetch stock price using the imported Finnhub API function
  const fetchStockPrice = async (symbol: string) => {
    return fetchStockPriceFinnhub(symbol);
  };

  // Calculate upside percentage
  const calculateUpside = (current: number | null, target: number | null) => {
    if (current && target) {
      const upside = ((target - current) / current) * 100;
      return upside.toFixed(2) + "%";
    }
    return "N/A";
  };

  // Add a new stock to the portfolio
  const addStock = async () => {
    if (!newSymbol || !newShares || !newAvgPrice) {
      Alert.alert("Missing Information", "Please fill in symbol, shares, and average price.");
      return;
    }

    setIsLoading(true);
    try {
      const newItem: Omit<StockEntry, 'id' | 'currentPrice' | 'targetPrice'> = {
        symbol: newSymbol.toUpperCase(),
        shares: parseFloat(newShares),
        avgPrice: parseFloat(newAvgPrice),
        notes: newNotes
      };

      const { data, error } = await supabase
        .from("portfolio")
        .insert([newItem])
        .select();

      if (error) throw error;

      // Clear form
      setNewSymbol("");
      setNewShares("");
      setNewAvgPrice("");
      setNewNotes("");
      setIsAdding(false);
      
      // Refresh portfolio
      fetchPortfolio();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a stock from the portfolio
  const deleteStock = async (id: string) => {
    try {
      const { error } = await supabase
        .from("portfolio")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      // Refresh portfolio
      fetchPortfolio();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <Layout>
        <TopNav
          middleContent="Portfolio Tracker"
          rightContent={
            <Ionicons
              name={isDarkmode ? "sunny" : "moon"}
              size={20}
              color={isDarkmode ? themeColor.white100 : themeColor.dark}
            />
          }
          rightAction={() => {
            isDarkmode ? setTheme("light") : setTheme("dark");
          }}
        />
        
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            padding: 20,
          }}
        >
          <Section>
            <SectionContent>
              <Text fontWeight="bold" size="h3" style={{ marginBottom: 10 }}>
                My Portfolio
              </Text>
              
              {isLoading ? (
                <ActivityIndicator size="large" color={themeColor.primary} />
              ) : (
                <>
                  {/* Portfolio Items Table Header */}
                  <View style={{ 
                    flexDirection: 'row', 
                    borderBottomWidth: 1, 
                    borderBottomColor: isDarkmode ? themeColor.white200 : themeColor.gray, 
                    paddingBottom: 5,
                    marginBottom: 10
                  }}>
                    <Text style={{ flex: 1, fontWeight: 'bold' }}>Symbol</Text>
                    <Text style={{ flex: 1, fontWeight: 'bold' }}>Shares</Text>
                    <Text style={{ flex: 1, fontWeight: 'bold' }}>Avg Price</Text>
                    <Text style={{ flex: 1, fontWeight: 'bold' }}>Current</Text>
                    <Text style={{ flex: 1, fontWeight: 'bold' }}>Target</Text>
                    <Text style={{ flex: 1, fontWeight: 'bold' }}>Upside</Text>
                    <Text style={{ width: 50 }}></Text>
                  </View>
                  
                  {/* Portfolio Items */}
                  {portfolioItems.length === 0 ? (
                    <Text style={{ textAlign: 'center', marginVertical: 20 }}>
                      No stocks in your portfolio yet. Add some!
                    </Text>
                  ) : (
                    portfolioItems.map((item) => (
                      <View 
                        key={item.id} 
                        style={{ 
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 10,
                          borderBottomWidth: 1,
                          borderBottomColor: isDarkmode ? themeColor.white100 : themeColor.gray200,
                        }}
                      >
                        <Text style={{ flex: 1 }}>{item.symbol}</Text>
                        <Text style={{ flex: 1 }}>{item.shares}</Text>
                        <Text style={{ flex: 1 }}>${item.avgPrice.toFixed(2)}</Text>
                        <Text style={{ flex: 1 }}>${item.currentPrice ? item.currentPrice.toFixed(2) : "N/A"}</Text>
                        <Text style={{ flex: 1 }}>${item.targetPrice ? item.targetPrice.toFixed(2) : "N/A"}</Text>
                        <Text 
                          style={{ 
                            flex: 1, 
                            color: item.currentPrice && item.targetPrice && item.targetPrice > item.currentPrice 
                              ? 'green' 
                              : 'red'
                          }}
                        >
                          {calculateUpside(item.currentPrice, item.targetPrice)}
                        </Text>
                        <Button
                          status="danger"
                          size="sm"
                          style={{ width: 50, height: 30 }}
                          text="X"
                          onPress={() => deleteStock(item.id)}
                        />
                      </View>
                    ))
                  )}
                  
                  {/* Add New Stock Form */}
                  {isAdding ? (
                    <View style={{ marginTop: 20 }}>
                      <Text fontWeight="bold" size="h3" style={{ marginBottom: 10 }}>
                        Add New Stock
                      </Text>
                      
                      <View style={{ marginBottom: 10 }}>
                        <TextInput
                          containerStyle={{ marginBottom: 0 }}
                          placeholder="Stock Symbol (e.g. AAPL)"
                          value={newSymbol}
                          onChangeText={handleSymbolInput}
                          autoCapitalize="characters"
                        />
                        
                        {/* Stock Symbol Suggestions Dropdown */}
                        {showSuggestions && (
                          <View style={{ 
                            position: 'absolute', 
                            top: 60, 
                            left: 0, 
                            right: 0, 
                            backgroundColor: isDarkmode ? themeColor.dark100 : themeColor.white,
                            borderWidth: 1,
                            borderColor: isDarkmode ? themeColor.dark100 : themeColor.gray200,
                            borderRadius: 5,
                            zIndex: 1000,
                            maxHeight: 200,
                          }}>
                            <FlatList
                              data={suggestions}
                              keyExtractor={(item) => item.symbol}
                              renderItem={({ item }) => (
                                <TouchableOpacity
                                  style={{
                                    padding: 10,
                                    borderBottomWidth: 1,
                                    borderBottomColor: isDarkmode ? themeColor.dark100 : themeColor.gray200,
                                  }}
                                  onPress={() => selectSuggestion(item)}
                                >
                                  <Text fontWeight="bold">{item.symbol}</Text>
                                  <Text>{item.name}</Text>
                                </TouchableOpacity>
                              )}
                            />
                          </View>
                        )}
                      </View>
                      
                      <TextInput
                        containerStyle={{ marginBottom: 10 }}
                        placeholder="Number of Shares"
                        value={newShares}
                        onChangeText={setNewShares}
                        keyboardType="numeric"
                      />
                      
                      <TextInput
                        containerStyle={{ marginBottom: 10 }}
                        placeholder="Average Price ($)"
                        value={newAvgPrice}
                        onChangeText={setNewAvgPrice}
                        keyboardType="numeric"
                      />
                      
                      <TextInput
                        containerStyle={{ marginBottom: 15 }}
                        placeholder="Notes (optional)"
                        value={newNotes}
                        onChangeText={setNewNotes}
                        multiline
                      />
                      
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Button
                          text="Cancel"
                          status="danger"
                          style={{ flex: 1, marginRight: 5 }}
                          onPress={() => {
                            setIsAdding(false);
                            setNewSymbol("");
                            setNewShares("");
                            setNewAvgPrice("");
                            setNewNotes("");
                          }}
                        />
                        <Button
                          text="Add Stock"
                          status="primary"
                          style={{ flex: 1, marginLeft: 5 }}
                          onPress={addStock}
                          disabled={isLoading}
                        />
                      </View>
                    </View>
                  ) : (
                    <Button
                      text="Add New Stock"
                      status="primary"
                      onPress={() => setIsAdding(true)}
                      style={{ marginTop: 15 }}
                    />
                  )}
                  
                  <Button
                    status="info"
                    text="Refresh Prices"
                    onPress={fetchPortfolio}
                    style={{ marginTop: 15 }}
                    disabled={isLoading}
                  />
                </>
              )}
            </SectionContent>
          </Section>
          
          {/* Portfolio Summary */}
          <Section style={{ marginTop: 20 }}>
            <SectionContent>
              <Text fontWeight="bold" size="h3" style={{ marginBottom: 10 }}>
                Portfolio Summary
              </Text>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                <Text>Total Stocks:</Text>
                <Text>{portfolioItems.length}</Text>
              </View>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                <Text>Total Value:</Text>
                <Text>
                  $
                  {portfolioItems
                    .reduce((sum, item) => {
                      return sum + (item.currentPrice || 0) * item.shares;
                    }, 0)
                    .toFixed(2)}
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text>Average Upside:</Text>
                <Text>
                  {portfolioItems.length > 0
                    ? (
                        portfolioItems.reduce((sum, item) => {
                          if (item.currentPrice && item.targetPrice) {
                            return sum + ((item.targetPrice - item.currentPrice) / item.currentPrice) * 100;
                          }
                          return sum;
                        }, 0) / portfolioItems.filter(item => item.currentPrice && item.targetPrice).length
                      ).toFixed(2) + "%"
                    : "N/A"}
                </Text>
              </View>
            </SectionContent>
          </Section>
          
          <Button
            status="danger"
            text="Logout"
            onPress={async () => {
              const { error } = await supabase.auth.signOut();
              if (!error) {
                alert("Signed out!");
              }
              if (error) {
                alert(error.message);
              }
            }}
            style={{
              marginTop: 20,
              marginBottom: 30,
            }}
          />
        </ScrollView>
      </Layout>
    </KeyboardAvoidingView>
  );
}