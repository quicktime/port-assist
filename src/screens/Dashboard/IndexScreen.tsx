// src/screens/Dashboard/IndexScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Dimensions } from "react-native";
import {
  Text,
  Card,
  Button,
  Surface,
  useTheme,
  ActivityIndicator,
  Divider,
  List,
  IconButton,
  ProgressBar,
  SegmentedButtons
} from "react-native-paper";
import { router } from "expo-router";
import { PieChart } from "react-native-chart-kit";
import { getPortfolioSummary, PortfolioItem } from "../../services/portfolio";
import { supabase } from "../../api/supabase";
import { batchUpdateOptionPrices } from "../../services/polygon";
import { BaseScreen, LoadingScreen, commonStyles, cardStyles } from "../index";

// Define the option position type
interface OptionPosition {
  id: string;
  underlying: string;
  symbol: string;
  contract_type: string;
  strike_price: number;
  expiration_date: string;
  quantity: number;
  avg_price: number;
  current_price?: number;
  value?: number;
  cost_basis?: number;
  profit_loss?: number;
  profit_loss_percent?: number;
  days_to_expiry?: number;
}

const screenWidth = Dimensions.get("window").width - 32; // Account for padding

export default function IndexScreen() {
  const paperTheme = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'stocks' | 'options'>('overview');
  
  // Portfolio data
  const [stockPortfolio, setStockPortfolio] = useState<PortfolioItem[]>([]);
  const [optionsPortfolio, setOptionsPortfolio] = useState<OptionPosition[]>([]);
  const [summary, setSummary] = useState({
    stocksValue: 0,
    optionsValue: 0,
    cashBalance: 0,
    totalValue: 0,
    stocksProfit: 0,
    optionsProfit: 0,
    totalProfit: 0,
    stocksProfitPercent: 0,
    optionsProfitPercent: 0,
    totalProfitPercent: 0
  });
  
  // Load portfolio data
  const loadPortfolioData = async () => {
    try {
      setLoading(true);
      
      // Load stock portfolio
      const portfolioSummary = await getPortfolioSummary();
      setStockPortfolio(portfolioSummary.items);
      
      // Load options portfolio
      const { data: optionsData, error: optionsError } = await supabase
        .from('options_positions')
        .select('*')
        .order('expiration_date', { ascending: true });
      
      if (optionsError) {
        throw new Error(optionsError.message);
      }
      
      if (optionsData && optionsData.length > 0) {
        // Calculate days to expiry
        const formattedOptions = optionsData.map(position => {
          const expiryDate = new Date(position.expiration_date);
          const today = new Date();
          const diffTime = expiryDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          return {
            ...position,
            days_to_expiry: diffDays
          };
        });
        
        // Update with current prices
        const optionsWithPrices = await batchUpdateOptionPrices(formattedOptions);
        
        // Calculate value, profit/loss
        const updatedOptions = optionsWithPrices.map(position => {
          if (position.current_price) {
            const value = position.current_price * position.quantity * 100; // Options are per contract (100 shares)
            const cost_basis = position.avg_price * position.quantity * 100;
            const profit_loss = value - cost_basis;
            const profit_loss_percent = (profit_loss / cost_basis) * 100;
            
            return {
              ...position,
              value,
              cost_basis,
              profit_loss,
              profit_loss_percent
            };
          }
          return position;
        });
        
        setOptionsPortfolio(updatedOptions);
      } else {
        // Use sample data for demo
        setOptionsPortfolio(getSampleOptionsPositions());
      }
      
      // Calculate combined summary
      calculateSummary(portfolioSummary.items, portfolioSummary.cashBalance, optionsData || getSampleOptionsPositions());
    } catch (error) {
      console.error("Error loading portfolio data:", error);
      // Use sample data on error
      const sampleStocks = getSampleStockPositions();
      const sampleOptions = getSampleOptionsPositions();
      setStockPortfolio(sampleStocks);
      setOptionsPortfolio(sampleOptions);
      calculateSummary(sampleStocks, 1000, sampleOptions);
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate combined summary
  const calculateSummary = (stocks: PortfolioItem[], cashBalance: number, options: OptionPosition[]) => {
    // Stock values
    const stocksValue = stocks.reduce((sum, item) => sum + (item.value || 0), 0);
    const stocksCost = stocks.reduce((sum, item) => sum + (item.cost_basis || 0), 0);
    const stocksProfit = stocks.reduce((sum, item) => sum + (item.profit_loss || 0), 0);
    const stocksProfitPercent = stocksCost > 0 ? (stocksProfit / stocksCost) * 100 : 0;
    
    // Option values
    const optionsValue = options.reduce((sum, item) => {
      if (item.current_price && item.quantity) {
        return sum + (item.current_price * item.quantity * 100);
      }
      return sum;
    }, 0);
    
    const optionsCost = options.reduce((sum, item) => {
      if (item.avg_price && item.quantity) {
        return sum + (item.avg_price * item.quantity * 100);
      }
      return sum;
    }, 0);
    
    const optionsProfit = optionsValue - optionsCost;
    const optionsProfitPercent = optionsCost > 0 ? (optionsProfit / optionsCost) * 100 : 0;
    
    // Combined values
    const totalValue = stocksValue + optionsValue + cashBalance;
    const totalCost = stocksCost + optionsCost;
    const totalProfit = stocksProfit + optionsProfit;
    const totalProfitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
    setSummary({
      stocksValue,
      optionsValue,
      totalValue,
      cashBalance,
      stocksProfit,
      optionsProfit,
      totalProfit,
      stocksProfitPercent,
      optionsProfitPercent,
      totalProfitPercent
    });
  };
  
  useEffect(() => {
    loadPortfolioData();
  }, []);
  
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPortfolioData();
    setRefreshing(false);
  }, []);
  
  // Generate sample stock positions data
  const getSampleStockPositions = (): PortfolioItem[] => {
    return [
      {
        id: 'sample-1',
        symbol: 'RXRX',
        shares: 100,
        avg_price: 15.75,
        current_price: 16.25,
        value: 100 * 16.25,
        cost_basis: 100 * 15.75,
        profit_loss: 100 * (16.25 - 15.75),
        profit_loss_percent: ((16.25 - 15.75) / 15.75) * 100
      },
      {
        id: 'sample-2',
        symbol: 'ACHR',
        shares: 100,
        avg_price: 12.33,
        current_price: 13.45,
        value: 100 * 13.45,
        cost_basis: 100 * 12.33,
        profit_loss: 100 * (13.45 - 12.33),
        profit_loss_percent: ((13.45 - 12.33) / 12.33) * 100
      },
      {
        id: 'sample-3',
        symbol: 'HOOD',
        shares: 80,
        avg_price: 22.14,
        current_price: 21.75,
        value: 80 * 21.75,
        cost_basis: 80 * 22.14,
        profit_loss: 80 * (21.75 - 22.14),
        profit_loss_percent: ((21.75 - 22.14) / 22.14) * 100
      }
    ];
  };
  
  // Generate sample options positions data
  const getSampleOptionsPositions = (): OptionPosition[] => {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);
    
    const twoMonths = new Date(today);
    twoMonths.setMonth(today.getMonth() + 2);
    
    return [
      {
        id: "sample-opt-1",
        underlying: "SPY",
        symbol: "SPY230721C00450000",
        contract_type: "call",
        strike_price: 450,
        expiration_date: nextMonth.toISOString().split('T')[0],
        quantity: 2,
        avg_price: 5.75,
        current_price: 6.30,
        value: 6.30 * 2 * 100,
        cost_basis: 5.75 * 2 * 100,
        profit_loss: (6.30 - 5.75) * 2 * 100,
        profit_loss_percent: ((6.30 - 5.75) / 5.75) * 100,
        days_to_expiry: Math.ceil((nextMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      },
      {
        id: "sample-opt-2",
        underlying: "AAPL",
        symbol: "AAPL230721P00180000",
        contract_type: "put",
        strike_price: 180,
        expiration_date: twoMonths.toISOString().split('T')[0],
        quantity: 1,
        avg_price: 4.20,
        current_price: 3.85,
        value: 3.85 * 1 * 100,
        cost_basis: 4.20 * 1 * 100,
        profit_loss: (3.85 - 4.20) * 1 * 100,
        profit_loss_percent: ((3.85 - 4.20) / 4.20) * 100,
        days_to_expiry: Math.ceil((twoMonths.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      },
      {
        id: "sample-opt-3",
        underlying: "TSLA",
        symbol: "TSLA230721C00250000",
        contract_type: "call",
        strike_price: 250,
        expiration_date: twoMonths.toISOString().split('T')[0],
        quantity: 3,
        avg_price: 8.50,
        current_price: 9.75,
        value: 9.75 * 3 * 100,
        cost_basis: 8.50 * 3 * 100,
        profit_loss: (9.75 - 8.50) * 3 * 100,
        profit_loss_percent: ((9.75 - 8.50) / 8.50) * 100,
        days_to_expiry: Math.ceil((twoMonths.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      }
    ];
  };
  
  // Chart colors
  const chartColors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
  ];
  
  // Prepare allocation chart data
  const getAllocationChartData = () => {
    // Calculate total portfolio value
    const totalValue = summary.totalValue;
    
    // Create chart data for stocks
    const stocksData = stockPortfolio.map((item, index) => ({
      name: item.symbol,
      population: ((item.value || 0) / totalValue) * 100,
      color: chartColors[index % chartColors.length],
      legendFontColor: paperTheme.dark ? '#FFF' : '#000',
      legendFontSize: 12,
    }));
    
    // Create chart data for options
    const optionsData = optionsPortfolio.map((item, index) => ({
      name: `${item.underlying} ${item.contract_type}`,
      population: ((item.value || 0) / totalValue) * 100,
      color: chartColors[(index + stockPortfolio.length) % chartColors.length],
      legendFontColor: paperTheme.dark ? '#FFF' : '#000',
      legendFontSize: 12,
    }));
    
    // Combine and return the top items
    return [...stocksData, ...optionsData].sort((a, b) => b.population - a.population).slice(0, 8);
  };
  
  const chartConfig = {
    backgroundGradientFrom: paperTheme.dark ? paperTheme.colors.surfaceVariant : paperTheme.colors.background,
    backgroundGradientTo: paperTheme.dark ? paperTheme.colors.surface : paperTheme.colors.background,
    decimalPlaces: 2,
    color: (opacity = 1) => paperTheme.dark 
      ? `rgba(255, 255, 255, ${opacity})` 
      : `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => paperTheme.dark 
      ? `rgba(255, 255, 255, ${opacity})` 
      : `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: paperTheme.dark ? paperTheme.colors.primary : paperTheme.colors.tertiary,
    }
  };
  
  // Render stock item card
  const renderStockItem = (item: PortfolioItem) => {
    const isProfitable = (item.profit_loss_percent || 0) >= 0;
    
    return (
      <Card style={styles.itemCard} key={item.id}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text variant="titleMedium">{item.symbol}</Text>
            <Text 
              variant="bodyMedium"
              style={{
                color: isProfitable ? paperTheme.colors.primary : paperTheme.colors.error,
              }}
            >
              {isProfitable ? "+" : ""}{item.profit_loss_percent?.toFixed(2)}%
            </Text>
          </View>
          
          <Text variant="bodyMedium">
            {item.shares} shares @ ${item.avg_price?.toFixed(2) || 0}
          </Text>
          
          <View style={styles.cardRow}>
            <Text variant="bodySmall">Current: ${item.current_price?.toFixed(2) || "N/A"}</Text>
            <Text variant="bodySmall">Value: ${item.value?.toFixed(2) || "N/A"}</Text>
          </View>
        </Card.Content>
      </Card>
    );
  };
  
  // Render option item card
  const renderOptionItem = (item: OptionPosition) => {
    const isProfitable = (item.profit_loss_percent || 0) >= 0;
    const isExpiringSoon = (item.days_to_expiry || 0) <= 7;
    
    return (
      <Card style={styles.itemCard} key={item.id}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.optionTypeContainer}>
              <Text variant="titleMedium">{item.underlying}</Text>
              <Surface style={[
                styles.optionTypeBadge,
                {
                  backgroundColor: item.contract_type === 'call' 
                    ? paperTheme.colors.primary 
                    : paperTheme.colors.error
                }
              ]}>
                <Text 
                  variant="labelSmall" 
                  style={{ color: paperTheme.colors.onPrimary }}
                >
                  {item.contract_type.toUpperCase()}
                </Text>
              </Surface>
            </View>
            <Text 
              variant="bodyMedium"
              style={{
                color: isProfitable ? paperTheme.colors.primary : paperTheme.colors.error,
              }}
            >
              {isProfitable ? "+" : ""}{item.profit_loss_percent?.toFixed(2)}%
            </Text>
          </View>
          
          <Text variant="bodyMedium">
            {item.quantity} contract{item.quantity !== 1 ? 's' : ''} | ${item.strike_price} strike
          </Text>
          
          <View style={styles.cardRow}>
            <Text variant="bodySmall">Exp: {item.expiration_date}</Text>
            <Text variant="bodySmall">Value: ${item.value?.toFixed(2) || "N/A"}</Text>
          </View>
          
          {isExpiringSoon && (
            <Text 
              variant="labelSmall" 
              style={{ color: paperTheme.colors.error, marginTop: 4 }}
            >
              Expires in {item.days_to_expiry} day{item.days_to_expiry !== 1 ? 's' : ''}
            </Text>
          )}
        </Card.Content>
      </Card>
    );
  };
  
  if (loading) {
    return <LoadingScreen message="Loading portfolio data..." />;
  }
  
  return (
    <BaseScreen title="My Portfolio">
      <ScrollView 
        style={commonStyles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[paperTheme.colors.primary]}
            tintColor={paperTheme.colors.primary}
          />
        }
      >
        <View style={styles.content}>
          {/* Portfolio Summary Card */}
          <Card style={styles.summaryCard}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.summaryTitle}>
                Portfolio Value: ${summary.totalValue.toFixed(2)}
              </Text>
              
              <View style={styles.profitRow}>
                <Text variant="bodyLarge">Total Profit/Loss:</Text>
                <Text
                  variant="bodyLarge"
                  style={{
                    fontWeight: 'bold',
                    color: summary.totalProfit >= 0 ? paperTheme.colors.primary : paperTheme.colors.error,
                  }}
                >
                  {summary.totalProfit >= 0 ? "+" : ""}{summary.totalProfitPercent.toFixed(2)}% 
                  (${summary.totalProfit.toFixed(2)})
                </Text>
              </View>
              
              <Divider style={styles.divider} />
              
              <View style={styles.allocationRow}>
                <View style={styles.allocationItem}>
                  <Text variant="titleMedium">${summary.stocksValue.toFixed(2)}</Text>
                  <Text variant="bodyMedium">Stocks</Text>
                  <Text
                    variant="bodySmall"
                    style={{
                      color: summary.stocksProfit >= 0 ? paperTheme.colors.primary : paperTheme.colors.error,
                    }}
                  >
                    {summary.stocksProfit >= 0 ? "+" : ""}{summary.stocksProfitPercent.toFixed(2)}%
                  </Text>
                </View>
                <View style={styles.allocationItem}>
                  <Text variant="titleMedium">${summary.cashBalance.toFixed(2)}</Text>
                  <Text variant="bodyMedium">Cash</Text>
                </View>
                <View style={styles.allocationItem}>
                  <Text variant="titleMedium">${summary.optionsValue.toFixed(2)}</Text>
                  <Text variant="bodyMedium">Options</Text>
                  <Text
                    variant="bodySmall"
                    style={{
                      color: summary.optionsProfit >= 0 ? paperTheme.colors.primary : paperTheme.colors.error,
                    }}
                  >
                    {summary.optionsProfit >= 0 ? "+" : ""}{summary.optionsProfitPercent.toFixed(2)}%
                  </Text>
                </View>
              </View>
              
              {/* Allocation Chart */}
              <View style={styles.chartContainer}>
                <Text variant="titleSmall" style={styles.chartTitle}>
                  Portfolio Allocation
                </Text>
                <PieChart
                  data={getAllocationChartData()}
                  width={screenWidth}
                  height={220}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute={false}
                />
              </View>
            </Card.Content>
          </Card>
          
          {/* Tab Selector */}
          <SegmentedButtons
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'overview' | 'stocks' | 'options')}
            buttons={[
              { value: 'overview', label: 'Overview' },
              { value: 'stocks', label: 'Stocks' },
              { value: 'options', label: 'Options' }
            ]}
            style={styles.tabSelector}
          />
          
          {/* Content based on active tab */}
          {activeTab === 'overview' && (
            <>
              {/* Quick Overview */}
              <View style={styles.sectionHeader}>
                <Text variant="titleMedium">Stock Portfolio</Text>
                <Button 
                  mode="text"
                  onPress={() => router.push("/(app)/portfolio")}
                  icon="chevron-right"
                  contentStyle={{ flexDirection: 'row-reverse' }}
                >
                  View All
                </Button>
              </View>
              
              <View style={styles.itemsGrid}>
                {stockPortfolio.slice(0, 3).map(renderStockItem)}
              </View>
              
              <View style={styles.sectionHeader}>
                <Text variant="titleMedium">Options Portfolio</Text>
                <Button 
                  mode="text"
                  onPress={() => router.push("/(app)/options")}
                  icon="chevron-right"
                  contentStyle={{ flexDirection: 'row-reverse' }}
                >
                  View All
                </Button>
              </View>
              
              <View style={styles.itemsGrid}>
                {optionsPortfolio.slice(0, 3).map(renderOptionItem)}
              </View>
              
              <View style={styles.actionsContainer}>
                <Button
                  mode="contained"
                  icon="plus"
                  style={styles.actionButton}
                  onPress={() => router.push("/(app)/portfolio/add")}
                >
                  Add Stock
                </Button>
                
                <Button
                  mode="contained"
                  icon="plus"
                  style={styles.actionButton}
                  onPress={() => router.push("/(app)/options/add")}
                >
                  Add Option
                </Button>
              </View>
            </>
          )}
          
          {activeTab === 'stocks' && (
            <>
              <View style={styles.sectionHeader}>
                <Text variant="titleMedium">Stock Portfolio</Text>
                <IconButton
                  icon="plus"
                  size={20}
                  onPress={() => router.push("/(app)/portfolio/add")}
                />
              </View>
              
              <View style={styles.itemsList}>
                {stockPortfolio.map(renderStockItem)}
              </View>
              
              {stockPortfolio.length === 0 && (
                <View style={styles.emptyState}>
                  <Text>No stocks in your portfolio</Text>
                  <Button
                    mode="contained"
                    icon="plus"
                    style={{ marginTop: 16 }}
                    onPress={() => router.push("/(app)/portfolio/add")}
                  >
                    Add Stock
                  </Button>
                </View>
              )}
            </>
          )}
          
          {activeTab === 'options' && (
            <>
              <View style={styles.sectionHeader}>
                <Text variant="titleMedium">Options Portfolio</Text>
                <IconButton
                  icon="plus"
                  size={20}
                  onPress={() => router.push("/(app)/options/add")}
                />
              </View>
              
              <View style={styles.itemsList}>
                {optionsPortfolio.map(renderOptionItem)}
              </View>
              
              {optionsPortfolio.length === 0 && (
                <View style={styles.emptyState}>
                  <Text>No options in your portfolio</Text>
                  <Button
                    mode="contained"
                    icon="plus"
                    style={{ marginTop: 16 }}
                    onPress={() => router.push("/(app)/options/add")}
                  >
                    Add Option
                  </Button>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32,
  },
  summaryCard: {
    marginBottom: 16,
    borderRadius: 8,
  },
  summaryTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  profitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 16,
  },
  allocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  allocationItem: {
    alignItems: 'center',
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  chartTitle: {
    marginBottom: 16,
  },
  tabSelector: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  itemsList: {
    marginBottom: 16,
  },
  itemCard: {
    width: '100%',
    marginBottom: 8,
    borderRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  optionTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionTypeBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  }
});