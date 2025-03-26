import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Text, Button, Surface, Card, Divider, IconButton } from 'react-native-paper';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PortfolioItem, getPortfolioSummary, deletePortfolioItem, getPortfolioWithCurrentPrices } from '../../services/portfolio';
import { fetchMarketStatus } from '../../services/polygon';
import BaseScreen from '../components/BaseScreen';
import LoadingScreen from '../components/LoadingScreen';
import EmptyState from '../components/EmptyState';
import PortfolioCard from '../../components/PortfolioCard';
import { commonStyles, cardStyles } from '../styles/common';

/**
 * Portfolio screen showing list of stocks and portfolio summary
 */
const PositionsScreen = () => {
  const paperTheme = useTheme();
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [summary, setSummary] = useState({
    totalValue: 0,
    totalCost: 0,
    totalProfit: 0,
    totalProfitPercent: 0,
    cashBalance: 0,
    cashAllocation: 0,
    totalPortfolioValue: 0
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadPortfolioData = async () => {
    try {
      setLoading(true);
      const summaryData = await getPortfolioSummary();
      setSummary({
        totalValue: summaryData.totalValue,
        totalCost: summaryData.totalCost,
        totalProfit: summaryData.totalProfit,
        totalProfitPercent: summaryData.totalProfitPercent,
        cashBalance: summaryData.cashBalance || 0,
        cashAllocation: summaryData.cashAllocation || 0,
        totalPortfolioValue: summaryData.totalPortfolioValue || summaryData.totalValue
      });
      setPortfolio(summaryData.items);
    } catch (error) {
      console.error('Error loading portfolio:', error);
      Alert.alert('Error', 'Failed to load portfolio data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolioData();

    // Automatically refresh data every 5 minutes when market is open
    let refreshInterval: NodeJS.Timeout | null = null;

    const setupRefreshInterval = async () => {
      try {
        const marketStatus = await fetchMarketStatus();

        if (marketStatus === 'open') {
          refreshInterval = setInterval(async () => {
            try {
              const updatedPortfolio = await getPortfolioWithCurrentPrices();
              setPortfolio(updatedPortfolio);
            } catch (error) {
              console.error('Error refreshing portfolio:', error);
            }
          }, 5 * 60 * 1000); // 5 minutes
        }
      } catch (error) {
        console.error('Error checking market status:', error);
      }
    };

    setupRefreshInterval();

    // Cleanup on unmount
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadPortfolioData();
    } catch (error) {
      console.error('Error refreshing portfolio:', error);
      Alert.alert('Error', 'Failed to refresh portfolio data');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleAddStock = () => {
    router.push('/portfolio/add');
  };

  const handleEditStock = (item: PortfolioItem) => {
    router.push({
      pathname: '/portfolio/edit',
      params: { item: JSON.stringify(item) }
    });
  };

  const handleDeleteStock = async (id?: string) => {
    if (!id) return;

    Alert.alert(
      'Delete Stock',
      'Are you sure you want to delete this stock from your portfolio?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePortfolioItem(id);
              await loadPortfolioData();
            } catch (error) {
              console.error('Error deleting stock:', error);
              Alert.alert('Error', 'Failed to delete stock');
            }
          }
        }
      ]
    );
  };

  const handleViewOptions = (symbol: string) => {
    router.push(`/options-chain/${symbol}`);
  };

  // Render portfolio item using PortfolioCard component
  const renderPortfolioItem = ({ item }: { item: PortfolioItem }) => (
    <PortfolioCard 
      item={item} 
      onPress={() => handleEditStock(item)}
    />
  );

  // Generate some sample data before user adds their own stocks
  const getSampleData = () => {
    return [
      {
        symbol: 'RXRX',
        shares: 100,
        avg_price: 15.75,
        current_price: 16.25,
        value: 1625,
        cost_basis: 1575,
        profit_loss: 50,
        profit_loss_percent: 3.17
      },
      {
        symbol: 'ACHR',
        shares: 100,
        avg_price: 12.33,
        current_price: 13.45,
        value: 1345,
        cost_basis: 1233,
        profit_loss: 112,
        profit_loss_percent: 9.08
      },
      {
        symbol: 'HOOD',
        shares: 80,
        avg_price: 22.14,
        current_price: 21.75,
        value: 1740,
        cost_basis: 1771.20,
        profit_loss: -31.20,
        profit_loss_percent: -1.76
      }
    ] as PortfolioItem[];
  };

  const displayedPortfolio = portfolio.length > 0 ? portfolio : getSampleData();

  if (loading) {
    return <LoadingScreen title="Portfolio" message="Loading portfolio data..." />;
  }

  // Portfolio header buttons component
  const PortfolioActions = () => (
    <View style={commonStyles.headerButtons}>
      <Button
        mode="contained"
        onPress={handleAddStock}
        icon="plus"
        style={commonStyles.headerButton}
      >
        Add Stock
      </Button>
      <Button
        mode="contained-tonal"
        onPress={() => router.push('/dashboard/trade-recommendations')}
        icon="finance"
        style={commonStyles.headerButton}
      >
        Trade Ideas
      </Button>
    </View>
  );

  return (
    <BaseScreen title="Portfolio">
      <View style={commonStyles.content}>
        {/* Portfolio Summary */}
        <Surface style={commonStyles.surface} elevation={1}>
          <View style={commonStyles.row}>
            <Text variant="titleMedium">Total Value</Text>
            <Text variant="titleMedium">${summary.totalValue.toFixed(2)}</Text>
          </View>

          <View style={commonStyles.row}>
            <Text variant="bodyMedium">Cost Basis</Text>
            <Text variant="bodyMedium">${summary.totalCost.toFixed(2)}</Text>
          </View>

          <View style={commonStyles.row}>
            <Text variant="bodyMedium">Profit/Loss</Text>
            <Text
              variant="bodyMedium"
              style={{
                color: summary.totalProfit >= 0 ? paperTheme.colors.primary : paperTheme.colors.error,
              }}
            >
              {summary.totalProfit >= 0 ? '+' : ''}{summary.totalProfitPercent.toFixed(2)}% (${summary.totalProfit.toFixed(2)})
            </Text>
          </View>
        </Surface>

        {/* Portfolio Header */}
        <View style={commonStyles.row}>
          <Text variant="titleLarge">Holdings</Text>
          <PortfolioActions />
        </View>

        {/* Portfolio List */}
        <FlatList
          data={displayedPortfolio}
          renderItem={renderPortfolioItem}
          keyExtractor={(item) => item.id || item.symbol}
          contentContainerStyle={{ paddingBottom: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[paperTheme.colors.primary]}
              tintColor={paperTheme.colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState 
              message="Your portfolio is empty. Add stocks to get started."
              icon="chart-line"
              buttonLabel="Add Stock"
              onButtonPress={handleAddStock}
            />
          }
        />

        {/* Cash Management Card */}
        {summary.cashBalance > 0 && (
          <TouchableOpacity
            onPress={() => router.push('/portfolio/cash')}
            style={{ marginBottom: 12 }}
          >
            <Card style={cardStyles.card}>
              <Card.Content>
                <View style={cardStyles.cardHeader}>
                  <Text variant="titleLarge">Cash</Text>
                  <IconButton
                    icon="cash-multiple"
                    size={20}
                    onPress={() => router.push('/portfolio/cash')}
                  />
                </View>

                <Divider style={commonStyles.divider} />

                <View style={cardStyles.cardRow}>
                  <Text variant="bodyMedium">Available for investment</Text>
                  <Text variant="bodyMedium">${summary.cashBalance.toFixed(2)}</Text>
                </View>

                <View style={cardStyles.cardRow}>
                  <Text variant="bodyMedium">Allocation</Text>
                  <Text variant="bodyMedium">{summary.cashAllocation.toFixed(2)}%</Text>
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        )}

        {portfolio.length === 0 && (
          <View style={commonStyles.emptyState}>
            <Text variant="bodyMedium" style={commonStyles.emptyText}>
              Sample data shown. Add your own stocks to get started.
            </Text>
          </View>
        )}
      </View>
    </BaseScreen>
  );
};

export default PositionsScreen;