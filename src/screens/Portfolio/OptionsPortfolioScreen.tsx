// src/screens/Portfolio/OptionsPortfolioScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import { View, FlatList, RefreshControl, TouchableOpacity, Alert, StyleSheet } from "react-native";
import {
  Appbar,
  Text,
  Card,
  Button,
  Surface,
  useTheme,
  IconButton,
  Divider,
  ActivityIndicator,
  FAB,
  Chip,
  SegmentedButtons
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAppTheme } from "../../provider/ThemeProvider";
import { supabase } from "../../api/supabase";
import { batchUpdateOptionPrices } from "../../services/polygon";
import { usePolygonWebSocket } from "../../hooks/usePolygonWebSocket";

export interface OptionPosition {
  id?: string;
  user_id?: string;
  symbol: string;
  underlying: string;
  contract_type: 'call' | 'put';
  strike_price: number;
  expiration_date: string;
  quantity: number;
  avg_price: number;
  current_price?: number;
  created_at?: string;
  updated_at?: string;
  
  // Calculated fields (not stored in DB)
  value?: number;
  cost_basis?: number;
  profit_loss?: number;
  profit_loss_percent?: number;
  days_to_expiry?: number;
}

export default function OptionsPortfolioScreen() {
  const { isDarkMode, toggleTheme } = useAppTheme();
  const paperTheme = useTheme();
  const { isConnected } = usePolygonWebSocket();
  
  const [positions, setPositions] = useState<OptionPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMode, setShowMode] = useState<'all' | 'calls' | 'puts'>('all');
  const [summary, setSummary] = useState({
    totalValue: 0,
    totalCost: 0,
    totalProfit: 0,
    totalProfitPercent: 0
  });
  
  // Fetch options positions
  const loadOptionsPositions = async () => {
    try {
      setLoading(true);
      
      // Fetch from Supabase
      const { data, error } = await supabase
        .from('options_positions')
        .select('*')
        .order('expiration_date', { ascending: true });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data && data.length > 0) {
        // Format and calculate additional data
        const formattedPositions = data.map(position => {
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
        const positionsWithPrices = await batchUpdateOptionPrices(formattedPositions);
        
        // Calculate value, profit/loss
        const updatedPositions = positionsWithPrices.map(position => {
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
        
        setPositions(updatedPositions);
        
        // Calculate summary
        const totalValue = updatedPositions.reduce((sum, pos) => sum + (pos.value || 0), 0);
        const totalCost = updatedPositions.reduce((sum, pos) => sum + (pos.cost_basis || 0), 0);
        const totalProfit = updatedPositions.reduce((sum, pos) => sum + (pos.profit_loss || 0), 0);
        const totalProfitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
        
        setSummary({
          totalValue,
          totalCost,
          totalProfit,
          totalProfitPercent
        });
      } else {
        // If no data, use sample data for demo purposes
        const sampleData = getSampleOptionsPositions();
        setPositions(sampleData);
        
        // Calculate summary for sample data
        const totalValue = sampleData.reduce((sum, pos) => sum + (pos.value || 0), 0);
        const totalCost = sampleData.reduce((sum, pos) => sum + (pos.cost_basis || 0), 0);
        const totalProfit = sampleData.reduce((sum, pos) => sum + (pos.profit_loss || 0), 0);
        const totalProfitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
        
        setSummary({
          totalValue,
          totalCost,
          totalProfit,
          totalProfitPercent
        });
      }
    } catch (error) {
      console.error("Error loading options positions:", error);
      Alert.alert("Error", "Failed to load options positions");
      
      // Use sample data on error
      const sampleData = getSampleOptionsPositions();
      setPositions(sampleData);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadOptionsPositions();
  }, []);
  
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOptionsPositions();
    setRefreshing(false);
  }, []);
  
  const handleAddPosition = () => {
    router.push('/add-option-position');
  };
  
  const handleEditPosition = (position: OptionPosition) => {
    router.push({
      pathname: '/edit-option-position',
      params: { position: JSON.stringify(position) }
    });
  };
  
  const handleDeletePosition = async (id?: string) => {
    if (!id) return;
    
    Alert.alert(
      "Delete Position",
      "Are you sure you want to delete this options position?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('options_positions')
                .delete()
                .eq('id', id);
              
              if (error) {
                throw new Error(error.message);
              }
              
              // Refresh positions after delete
              await loadOptionsPositions();
            } catch (error) {
              console.error("Error deleting option position:", error);
              Alert.alert("Error", "Failed to delete option position");
            }
          }
        }
      ]
    );
  };
  
  const handleViewDetails = (underlying: string) => {
    router.push(`/options-chain/${underlying}`);
  };
  
  // Filter positions based on selected mode
  const filteredPositions = positions.filter(position => {
    if (showMode === 'all') return true;
    if (showMode === 'calls') return position.contract_type === 'call';
    if (showMode === 'puts') return position.contract_type === 'put';
    return true;
  });
  
  const renderOptionPosition = ({ item }: { item: OptionPosition }) => {
    const isProfitable = (item.profit_loss_percent || 0) >= 0;
    const isExpiringSoon = (item.days_to_expiry || 0) <= 7;
    
    return (
      <TouchableOpacity
        onPress={() => handleEditPosition(item)}
        onLongPress={() => handleDeletePosition(item.id)}
        style={styles.itemContainer}
      >
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <View style={styles.symbolContainer}>
                <Text variant="titleLarge">{item.underlying}</Text>
                <Chip 
                  mode="outlined" 
                  style={[
                    styles.typeChip, 
                    { 
                      borderColor: item.contract_type === 'call' 
                        ? paperTheme.colors.primary 
                        : paperTheme.colors.error 
                    }
                  ]}
                  textStyle={{ 
                    color: item.contract_type === 'call' 
                      ? paperTheme.colors.primary 
                      : paperTheme.colors.error 
                  }}
                >
                  {item.contract_type.toUpperCase()}
                </Chip>
              </View>
              <IconButton
                icon="chart-line-variant"
                size={20}
                onPress={() => handleViewDetails(item.underlying)}
              />
            </View>
            
            <Text variant="bodyMedium">
              {item.quantity} contract{item.quantity !== 1 ? 's' : ''} | ${item.strike_price} strike | Exp: {item.expiration_date}
            </Text>
            
            {isExpiringSoon && (
              <Chip 
                mode="flat" 
                style={styles.expiryChip}
                textStyle={{ color: paperTheme.colors.onError }}
              >
                Expires in {item.days_to_expiry} day{item.days_to_expiry !== 1 ? 's' : ''}
              </Chip>
            )}
            
            <Divider style={styles.divider} />
            
            <View style={styles.cardRow}>
              <Text variant="bodyMedium">Avg Price: ${item.avg_price.toFixed(2)}</Text>
              <Text variant="bodyMedium">Current: ${item.current_price?.toFixed(2) || "N/A"}</Text>
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
  
  // Generate sample options positions data
  const getSampleOptionsPositions = (): OptionPosition[] => {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);
    
    const twoMonths = new Date(today);
    twoMonths.setMonth(today.getMonth() + 2);
    
    return [
      {
        id: "sample-1",
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
        id: "sample-2",
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
        id: "sample-3",
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
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Appbar.Header>
          <Appbar.Content title="Options Portfolio" />
          <Appbar.Action
            icon={isDarkMode ? "white-balance-sunny" : "moon-waning-crescent"}
            onPress={toggleTheme}
          />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={paperTheme.colors.primary} />
          <Text variant="bodyMedium" style={{ marginTop: 16 }}>Loading options positions...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header>
        <Appbar.Content title="Options Portfolio" />
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
        
        <View style={styles.filterContainer}>
          <SegmentedButtons
            value={showMode}
            onValueChange={(value) => setShowMode(value as 'all' | 'calls' | 'puts')}
            buttons={[
              { value: 'all', label: 'All' },
              { value: 'calls', label: 'Calls' },
              { value: 'puts', label: 'Puts' }
            ]}
          />
        </View>
        
        <FlatList
          data={filteredPositions}
          renderItem={renderOptionPosition}
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
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text variant="bodyLarge">No options positions found</Text>
              <Text variant="bodyMedium" style={styles.emptyText}>
                Add your first options position by tapping the + button
              </Text>
            </View>
          )}
        />
        
        <FAB
          icon="plus"
          style={[
            styles.fab,
            { backgroundColor: paperTheme.colors.primary }
          ]}
          onPress={handleAddPosition}
        />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  filterContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  listContainer: {
    paddingBottom: 80, // Space for FAB
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
  symbolContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  typeChip: {
    marginLeft: 8,
  },
  expiryChip: {
    marginTop: 8,
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    alignSelf: "flex-start",
  },
  divider: {
    marginVertical: 8,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 48,
  },
  emptyText: {
    marginTop: 8,
    opacity: 0.7,
    textAlign: 'center',
  }
});