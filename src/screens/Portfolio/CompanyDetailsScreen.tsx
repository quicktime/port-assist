import React, { useState, useEffect } from "react";
import { View, ScrollView, StyleSheet, Linking } from "react-native";
import {
  Appbar,
  Text,
  Card,
  Button,
  Divider,
  useTheme,
  ActivityIndicator,
  Chip,
  List
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { fetchCompanyDetails, fetchStockPrice, fetchHistoricalPrices } from "../services/polygonService";
import { useAppTheme } from "../../provider/ThemeProvider";
import { LineChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";

const screenWidth = Dimensions.get("window").width - 32; // Adjust for padding

type CompanyDetailsScreenProps = {
  symbol: string;
};

export default function CompanyDetailsScreen({ symbol }: CompanyDetailsScreenProps) {
  const { isDarkMode, toggleTheme } = useAppTheme();
  const paperTheme = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<any>(null);
  const [stockData, setStockData] = useState<any>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [chartTimeframe, setChartTimeframe] = useState<'1M' | '3M' | '6M' | '1Y'>('3M');
  
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load company details
        const companyDetails = await fetchCompanyDetails(symbol as string);
        setCompany(companyDetails);
        
        // Load current stock price
        const stockPrice = await fetchStockPrice(symbol as string);
        setStockData(stockPrice);
        
        // Load historical price data
        await loadHistoricalData(chartTimeframe);
      } catch (error) {
        console.error("Error loading company data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [symbol]);
  
  const loadHistoricalData = async (timeframe: '1M' | '3M' | '6M' | '1Y') => {
    try {
      const today = new Date();
      let fromDate = new Date();
      
      // Calculate from date based on timeframe
      switch (timeframe) {
        case '1M':
          fromDate.setMonth(today.getMonth() - 1);
          break;
        case '3M':
          fromDate.setMonth(today.getMonth() - 3);
          break;
        case '6M':
          fromDate.setMonth(today.getMonth() - 6);
          break;
        case '1Y':
          fromDate.setFullYear(today.getFullYear() - 1);
          break;
      }
      
      const from = fromDate.toISOString().split('T')[0];
      const to = today.toISOString().split('T')[0];
      
      // Get historical data from Polygon API
      const data = await fetchHistoricalPrices(
        symbol as string,
        'day',
        from,
        to
      );
      
      setHistoricalData(data);
    } catch (error) {
      console.error("Error loading historical data:", error);
    }
  };
  
  const handleTimeframeChange = async (timeframe: '1M' | '3M' | '6M' | '1Y') => {
    setChartTimeframe(timeframe);
    await loadHistoricalData(timeframe);
  };
  
  const handleViewOptions = () => {
    router.push(`/options-chain/${symbol}`);
  };
  
  const handleAddToPortfolio = () => {
    router.push('/add-stock');
  };
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title={symbol} />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={paperTheme.colors.primary} />
          <Text style={{ marginTop: 16 }}>Loading company data...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // Prepare chart data
  const chartData = {
    labels: historicalData.length > 6 
      ? historicalData
          .filter((_, index) => index % Math.floor(historicalData.length / 6) === 0)
          .map(data => data.date.substring(5))
      : historicalData.map(data => data.date.substring(5)),
    datasets: [
      {
        data: historicalData.length > 0 
          ? historicalData.map(data => data.close)
          : [0],
        color: (opacity = 1) => isDarkMode 
          ? `rgba(134, 65, 244, ${opacity})` 
          : `rgba(46, 125, 50, ${opacity})`,
        strokeWidth: 2
      }
    ]
  };
  
  const chartConfig = {
    backgroundGradientFrom: isDarkMode ? paperTheme.colors.surfaceVariant : paperTheme.colors.background,
    backgroundGradientTo: isDarkMode ? paperTheme.colors.surface : paperTheme.colors.background,
    decimalPlaces: 2,
    color: (opacity = 1) => isDarkMode 
      ? `rgba(255, 255, 255, ${opacity})` 
      : `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => isDarkMode 
      ? `rgba(255, 255, 255, ${opacity})` 
      : `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: isDarkMode ? paperTheme.colors.primary : paperTheme.colors.tertiary,
    }
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={symbol} subtitle={company?.name || ''} />
        <Appbar.Action 
          icon={isDarkMode ? "white-balance-sunny" : "moon-waning-crescent"} 
          onPress={toggleTheme} 
        />
      </Appbar.Header>
      
      <ScrollView style={styles.scrollContainer}>
        {/* Stock Price Overview */}
        <Card style={styles.card}>
          <Card.Title 
            title="Price Overview" 
            subtitle={`Last updated: ${new Date().toLocaleTimeString()}`} 
          />
          <Card.Content>
            <View style={styles.priceOverview}>
              <View>
                <Text variant="displaySmall">${stockData?.currentPrice.toFixed(2)}</Text>
                <Text 
                  variant="bodyMedium"
                  style={{
                    color: stockData?.change >= 0 ? paperTheme.colors.primary : paperTheme.colors.error
                  }}
                >
                  {stockData?.change >= 0 ? '+' : ''}{stockData?.change.toFixed(2)} ({stockData?.changePercent.toFixed(2)}%)
                </Text>
              </View>
              
              <View style={styles.actionsContainer}>
                <Button 
                  mode="contained" 
                  onPress={handleAddToPortfolio}
                  style={styles.actionButton}
                >
                  Add to Portfolio
                </Button>
                <Button
                  mode="outlined"
                  onPress={handleViewOptions}
                  style={styles.actionButton}
                >
                  View Options
                </Button>
              </View>
            </View>
          </Card.Content>
        </Card>
        
        {/* Price Chart */}
        <Card style={styles.card}>
          <Card.Title title="Price History" />
          <Card.Content>
            <View style={styles.timeframeButtons}>
              <Chip 
                selected={chartTimeframe === '1M'} 
                onPress={() => handleTimeframeChange('1M')}
                style={styles.timeframeChip}
              >
                1M
              </Chip>
              <Chip 
                selected={chartTimeframe === '3M'} 
                onPress={() => handleTimeframeChange('3M')}
                style={styles.timeframeChip}
              >
                3M
              </Chip>
              <Chip 
                selected={chartTimeframe === '6M'} 
                onPress={() => handleTimeframeChange('6M')}
                style={styles.timeframeChip}
              >
                6M
              </Chip>
              <Chip 
                selected={chartTimeframe === '1Y'} 
                onPress={() => handleTimeframeChange('1Y')}
                style={styles.timeframeChip}
              >
                1Y
              </Chip>
            </View>
            
            {historicalData.length > 0 ? (
              <LineChart
                data={chartData}
                width={screenWidth}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
              />
            ) : (
              <View style={styles.noDataContainer}>
                <Text>No historical data available</Text>
              </View>
            )}
          </Card.Content>
        </Card>
        
        {/* Company Details */}
        <Card style={styles.card}>
          <Card.Title title="Company Information" />
          <Card.Content>
            {company?.description ? (
              <Text variant="bodyMedium" style={styles.description}>
                {company.description}
              </Text>
            ) : (
              <Text variant="bodyMedium" style={styles.description}>
                No company description available.
              </Text>
            )}
            
            <Divider style={styles.divider} />
            
            <List.Item
              title="Industry"
              description={company?.industry || 'N/A'}
              left={props => <List.Icon {...props} icon="briefcase-outline" />}
            />
            
            <Divider style={styles.divider} />
            
            <List.Item
              title="Exchange"
              description={company?.exchange || 'N/A'}
              left={props => <List.Icon {...props} icon="bank-outline" />}
            />
            
            {company?.marketCap && (
              <>
                <Divider style={styles.divider} />
                <List.Item
                  title="Market Cap"
                  description={`$${(company.marketCap / 1000000000).toFixed(2)} billion`}
                  left={props => <List.Icon {...props} icon="chart-donut" />}
                />
              </>
            )}
            
            {company?.employees && (
              <>
                <Divider style={styles.divider} />
                <List.Item
                  title="Employees"
                  description={company.employees.toLocaleString()}
                  left={props => <List.Icon {...props} icon="account-group" />}
                />
              </>
            )}
            
            {company?.website && (
              <>
                <Divider style={styles.divider} />
                <List.Item
                  title="Website"
                  description={company.website}
                  left={props => <List.Icon {...props} icon="web" />}
                  onPress={() => Linking.openURL(company.website)}
                  right={props => <List.Icon {...props} icon="open-in-new" />}
                />
              </>
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginBottom: 16,
    borderRadius: 8,
  },
  priceOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionsContainer: {
    alignItems: 'flex-end',
  },
  actionButton: {
    marginVertical: 4,
    minWidth: 130,
  },
  timeframeButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  timeframeChip: {
    marginHorizontal: 4,
  },
  chart: {
    borderRadius: 16,
    paddingRight: 16,
  },
  noDataContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    marginBottom: 16,
    lineHeight: 22,
  },
  divider: {
    marginVertical: 8,
  }
});