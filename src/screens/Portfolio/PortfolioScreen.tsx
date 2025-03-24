import React, { useState, useEffect, useCallback } from "react";
import { View, FlatList, RefreshControl, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Appbar,
  Text,
  Card,
  Button,
  Surface,
  useTheme,
  IconButton,
  Divider,
  ActivityIndicator
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { getPortfolioWithCurrentPrices, getPortfolioSummary, PortfolioItem, deletePortfolioItem } from "../services/portfolioService";
import { MainStackParamList } from "../../types/navigation";
import { useAppTheme } from "../../provider/ThemeProvider";

export default function PortfolioScreen() {
  const { isDarkMode, toggleTheme } = useAppTheme();
  const paperTheme = useTheme();
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [summary, setSummary] = useState({
    totalValue: 0,
    totalCost: 0,
    totalProfit: 0,
    totalProfitPercent: 0
  });
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const loadPortfolio = async () => {
    try {
      const portfolioData = await getPortfolioWithCurrentPrices();
      setPortfolio(portfolioData);
      
      const summaryData = await getPortfolioSummary();
      setSummary({
        totalValue: summaryData.totalValue,
        totalCost: summaryData.totalCost,
        totalProfit: summaryData.totalProfit,
        totalProfitPercent: summaryData.totalProfitPercent
      });
    } catch (error) {
      console.error("Error loading portfolio:", error);
      Alert.alert("Error", "Failed to load portfolio data");
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPortfolio();
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPortfolio();
    }, [])
  );

  const handleAddStock = () => {
    navigation.navigate("AddStock");
  };

  const handleEditStock = (item: PortfolioItem) => {
    navigation.navigate("EditStock", { item });
  };

  const handleDeleteStock = async (id?: string) => {
    if (!id) return;
    
    Alert.alert(
      "Delete Stock",
      "Are you sure you want to delete this stock from your portfolio?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              await deletePortfolioItem(id);
              loadPortfolio();
            } catch (error) {
              console.error("Error deleting stock:", error);
              Alert.alert("Error", "Failed to delete stock");
            }
          }
        }
      ]
    );
  };

  const handleViewOptions = (symbol: string) => {
    navigation.navigate("OptionsChain", { symbol });
  };

  const renderPortfolioItem = ({ item }: { item: PortfolioItem }) => {
    const isProfitable = (item.profit_loss_percent || 0) >= 0;
    
    return (
      <TouchableOpacity
        onPress={() => handleEditStock(item)}
        onLongPress={() => handleDeleteStock(item.id)}
        style={styles.itemContainer}
      >
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text variant="titleLarge">{item.symbol}</Text>
              <IconButton
                icon="chart-line-variant"
                size={20}
                onPress={() => handleViewOptions(item.symbol)}
              />
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.cardRow}>
              <Text variant="bodyMedium">{item.shares} shares @ ${item.avg_price.toFixed(2)}</Text>
              <Text variant="bodyMedium">${item.current_price?.toFixed(2) || "N/A"}</Text>
            </View>
            
            <View style={styles.cardRow}>
              <Text variant="bodyMedium">Value: ${item.value?.toFixed(2) || "N/A"}</Text>
              <Text
                variant="bodyMedium"
                style={{
                  color: isProfitable ? paperTheme.colors.primary : paperTheme.colors.error,
                }}
              >
                {isProfitable ? "+" : ""}{item.profit_loss_percent?.toFixed(2)}% (${item.profit_loss?.toFixed(2)})
              </Text>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  // Generate some sample data before user adds their own stocks
  const getSampleData = () => {
    return [
      {
        symbol: "RXRX",
        shares: 100,
        avg_price: 15.75,
        current_price: 16.25,
        value: 1625,
        cost_basis: 1575,
        profit_loss: 50,
        profit_loss_percent: 3.17
      },
      {
        symbol: "ACHR",
        shares: 100,
        avg_price: 12.33,
        current_price: 13.45,
        value: 1345,
        cost_basis: 1233,
        profit_loss: 112,
        profit_loss_percent: 9.08
      },
      {
        symbol: "HOOD",
        shares: 80,
        avg_price: 22.14,
        current_price: 21.75,
        value: 1740,
        cost_basis: 1771.20,
        profit_loss: -31.20,
        profit_loss_percent: -1.76
      }
    ];
  };

  const displayedPortfolio = portfolio.length > 0 ? portfolio : getSampleData();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header>
        <Appbar.Content title="Portfolio" />
        <Appbar.Action 
          icon={isDarkMode ? "white-balance-sunny" : "moon-waning-crescent"} 
          onPress={toggleTheme} 
        />
      </Appbar.Header>

      <View style={styles.content}>
        <Surface style={styles.summaryCard} elevation={1}>
          <View style={styles.summaryRow}>
            <Text variant="titleMedium">Total Value</Text>
            <Text variant="titleMedium">${summary.totalValue.toFixed(2)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text variant="bodyMedium">Cost Basis</Text>
            <Text variant="bodyMedium">${summary.totalCost.toFixed(2)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text variant="bodyMedium">Profit/Loss</Text>
            <Text
              variant="bodyMedium"
              style={{
                color: summary.totalProfit >= 0 ? paperTheme.colors.primary : paperTheme.colors.error,
              }}
            >
              {summary.totalProfit >= 0 ? "+" : ""}{summary.totalProfitPercent.toFixed(2)}% (${summary.totalProfit.toFixed(2)})
            </Text>
          </View>
        </Surface>

        <View style={styles.holdingsHeader}>
          <Text variant="titleLarge">Holdings</Text>
          <Button
            mode="contained"
            onPress={handleAddStock}
            icon="plus"
          >
            Add Stock
          </Button>
        </View>

        <FlatList
          data={displayedPortfolio}
          renderItem={renderPortfolioItem}
          keyExtractor={(item) => item.id || item.symbol}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[paperTheme.colors.primary]}
              tintColor={paperTheme.colors.primary}
            />
          }
        />

        {portfolio.length === 0 && (
          <View style={styles.emptyState}>
            <Text variant="bodyMedium" style={styles.emptyText}>
              Sample data shown. Add your own stocks to get started.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  summaryCard: {
    padding: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  holdingsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
  },
  listContainer: {
    paddingBottom: 16,
  },
  itemContainer: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  divider: {
    marginVertical: 8,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  emptyState: {
    alignItems: "center",
    marginTop: 24,
  },
  emptyText: {
    fontStyle: "italic",
    opacity: 0.7,
  },
});