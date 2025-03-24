import React, { useState, useEffect } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import {
  Appbar,
  Text,
  Card,
  Surface,
  useTheme,
  Button,
  Divider,
  Avatar,
  List,
  IconButton
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../../provider/ThemeProvider";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../initSupabase";
import { getPortfolioSummary } from "../services/portfolioService";
import { getContributionSummary, Contribution } from "../services/contributionService";
import { fetchMarketStatus } from "../services/polygonService";
import { PieChart, LineChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width - 32; // Account for padding

export default function Dashboard() {
  const { isDarkMode, toggleTheme } = useAppTheme();
  const paperTheme = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [portfolioSummary, setPortfolioSummary] = useState({
    totalValue: 0,
    totalCost: 0,
    totalProfit: 0,
    totalProfitPercent: 0,
    items: [] as any[]
  });
  const [contributionSummary, setContributionSummary] = useState({
    totalContributed: 0,
    totalRemaining: 0,
    completedCount: 0,
    upcomingCount: 0,
    nextDate: null as string | null,
    nextAmount: null as number | null
  });
  const [marketStatus, setMarketStatus] = useState<string>("unknown");
  
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Get user session data
        const { data } = await supabase.auth.getSession();
        setUserEmail(data.session?.user?.email || null);
        
        // Get market status
        const status = await fetchMarketStatus();
        setMarketStatus(status.market);
        
        // Get portfolio summary
        const portfolio = await getPortfolioSummary();
        setPortfolioSummary(portfolio);
        
        // Get contribution summary
        const contributions = await getContributionSummary();
        setContributionSummary(contributions);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadDashboardData();
  }, []);
  
  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No upcoming contributions";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  
  // Prepare chart data
  const getAllocationChartData = () => {
    // Get top 5 holdings
    const topHoldings = [...portfolioSummary.items]
      .sort((a, b) => (b.value || 0) - (a.value || 0))
      .slice(0, 5);
      
    // Calculate 'Others' category if more than 5 holdings
    let othersValue = 0;
    if (portfolioSummary.items.length > 5) {
      othersValue = portfolioSummary.items
        .slice(5)
        .reduce((sum, item) => sum + (item.value || 0), 0);
    }
    
    const chartData = topHoldings.map((item, index) => ({
      name: item.symbol,
      population: item.allocation || 0,
      color: chartColors[index % chartColors.length],
      legendFontColor: isDarkMode ? '#FFF' : '#000',
      legendFontSize: 12,
    }));
    
    // Add 'Others' category if needed
    if (othersValue > 0) {
      chartData.push({
        name: 'Others',
        population: (othersValue / portfolioSummary.totalValue) * 100,
        color: chartColors[5],
        legendFontColor: isDarkMode ? '#FFF' : '#000',
        legendFontSize: 12,
      });
    }
    
    return chartData;
  };
  
  // Sample performance data (would be replaced with real data in production)
  const getPerformanceData = () => {
    return {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      datasets: [
        {
          data: [
            portfolioSummary.totalValue * 0.9,
            portfolioSummary.totalValue * 0.95,
            portfolioSummary.totalValue * 0.92,
            portfolioSummary.totalValue * 0.97,
            portfolioSummary.totalValue * 0.99,
            portfolioSummary.totalValue
          ],
          color: (opacity = 1) => isDarkMode 
            ? `rgba(134, 65, 244, ${opacity})` 
            : `rgba(46, 125, 50, ${opacity})`,
          strokeWidth: 2
        }
      ]
    };
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
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <Appbar.Header>
        <Appbar.Content title="Dashboard" />
        <Appbar.Action
          icon={isDarkMode ? "white-balance-sunny" : "weather-night"}
          onPress={toggleTheme}
        />
      </Appbar.Header>
      
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.container}>
          {/* User Overview Card */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.userInfoContainer}>
                <Avatar.Icon size={50} icon="account" style={{ backgroundColor: paperTheme.colors.primary }} />
                <View style={styles.userTextContainer}>
                  <Text variant="titleLarge">Welcome back!</Text>
                  <Text variant="bodyMedium">{userEmail || 'User'}</Text>
                </View>
                <View style={styles.marketStatusContainer}>
                  <Text variant="bodySmall">Market: </Text>
                  <View style={[
                    styles.statusIndicator, 
                    { 
                      backgroundColor: marketStatus === 'open' 
                        ? paperTheme.colors.primary
                        : marketStatus === 'closed'
                          ? paperTheme.colors.error
                          : paperTheme.colors.secondary
                    }
                  ]} />
                  <Text variant="bodySmall">
                    {marketStatus === 'open' ? 'Open' : marketStatus === 'closed' ? 'Closed' : 'Extended Hours'}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
          
          {/* Portfolio Overview */}
          <Card style={styles.card}>
            <Card.Title 
              title="Portfolio Overview" 
              right={(props) => (
                <IconButton 
                  {...props} 
                  icon="chevron-right" 
                  onPress={() => router.push('/portfolio')} 
                />
              )}
            />
            <Card.Content>
              <View style={styles.portfolioSummary}>
                <View style={styles.summaryItem}>
                  <Text variant="titleLarge">${portfolioSummary.totalValue.toFixed(2)}</Text>
                  <Text variant="bodySmall">Total Value</Text>
                </View>
                
                <View style={styles.summaryItem}>
                  <Text 
                    variant="titleLarge"
                    style={{
                      color: portfolioSummary.totalProfit >= 0 
                        ? paperTheme.colors.primary 
                        : paperTheme.colors.error
                    }}
                  >
                    {portfolioSummary.totalProfit >= 0 ? '+' : ''}
                    ${portfolioSummary.totalProfit.toFixed(2)}
                  </Text>
                  <Text variant="bodySmall">Total Profit/Loss</Text>
                </View>
                
                <View style={styles.summaryItem}>
                  <Text 
                    variant="titleLarge"
                    style={{
                      color: portfolioSummary.totalProfitPercent >= 0 
                        ? paperTheme.colors.primary 
                        : paperTheme.colors.error
                    }}
                  >
                    {portfolioSummary.totalProfitPercent >= 0 ? '+' : ''}
                    {portfolioSummary.totalProfitPercent.toFixed(2)}%
                  </Text>
                  <Text variant="bodySmall">Return</Text>
                </View>
              </View>
              
              <View style={styles.allocationContainer}>
                <Text variant="titleMedium" style={styles.chartTitle}>Portfolio Allocation</Text>
                {portfolioSummary.items.length > 0 ? (
                  <PieChart
                    data={getAllocationChartData()}
                    width={screenWidth - 32} // Adjust for padding
                    height={200}
                    chartConfig={chartConfig}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    absolute={false}
                  />
                ) : (
                  <View style={styles.emptyChartContainer}>
                    <Text>No portfolio data available</Text>
                  </View>
                )}
              </View>
              
              <Button 
                mode="contained"
                icon="chart-line"
                onPress={() => router.push('/portfolio')}
                style={styles.viewButton}
              >
                View Portfolio
              </Button>
            </Card.Content>
          </Card>
          
          {/* Contributions Overview */}
          <Card style={styles.card}>
            <Card.Title 
              title="Investment Plan" 
              right={(props) => (
                <IconButton 
                  {...props} 
                  icon="chevron-right" 
                  onPress={() => router.push('/profile')} 
                />
              )}
            />
            <Card.Content>
              <View style={styles.contributionStats}>
                <Surface style={styles.contributionStatBox} elevation={1}>
                  <MaterialCommunityIcons 
                    name="bank-transfer-in" 
                    size={24} 
                    color={paperTheme.colors.primary} 
                  />
                  <Text variant="headlineSmall">
                    ${contributionSummary.totalContributed.toFixed(0)}
                  </Text>
                  <Text variant="bodySmall">Contributed</Text>
                </Surface>
                
                <Surface style={styles.contributionStatBox} elevation={1}>
                  <MaterialCommunityIcons 
                    name="calendar-month" 
                    size={24} 
                    color={paperTheme.colors.secondary} 
                  />
                  <Text variant="headlineSmall">
                    ${contributionSummary.nextAmount || 777}
                  </Text>
                  <Text variant="bodySmall">Next Contribution</Text>
                </Surface>
                
                <Surface style={styles.contributionStatBox} elevation={1}>
                  <MaterialCommunityIcons 
                    name="chart-timeline-variant" 
                    size={24} 
                    color={paperTheme.colors.tertiary} 
                  />
                  <Text variant="headlineSmall">
                    {contributionSummary.upcomingCount}
                  </Text>
                  <Text variant="bodySmall">Remaining</Text>
                </Surface>
              </View>
              
              <Divider style={styles.divider} />
              
              <View style={styles.nextContributionContainer}>
                <Text variant="titleMedium">Next Contribution</Text>
                <Text variant="bodyLarge">
                  {formatDate(contributionSummary.nextDate)}
                </Text>
              </View>
              
              <Button 
                mode="contained"
                icon="cash-multiple"
                onPress={() => router.push('/profile')}
                style={styles.viewButton}
              >
                Manage Investment Plan
              </Button>
            </Card.Content>
          </Card>
          
          {/* Performance Chart */}
          <Card style={styles.card}>
            <Card.Title title="Performance Trend" />
            <Card.Content>
              <LineChart
                data={getPerformanceData()}
                width={screenWidth - 32} // Adjust for padding
                height={220}
                chartConfig={chartConfig}
                bezier
                style={{
                  marginVertical: 8,
                  borderRadius: 16,
                }}
              />
              <Text variant="bodySmall" style={styles.chartCaption}>
                Portfolio performance over the last 6 months
              </Text>
            </Card.Content>
          </Card>
          
          {/* Quick Actions */}
          <Card style={[styles.card, { marginBottom: 30 }]}>
            <Card.Title title="Quick Actions" />
            <Card.Content>
              <View style={styles.actionsContainer}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => router.push('/add-stock')}
                >
                  <Surface style={styles.actionIconContainer} elevation={3}>
                    <MaterialCommunityIcons 
                      name="plus-circle-outline" 
                      size={32} 
                      color={paperTheme.colors.primary} 
                    />
                  </Surface>
                  <Text variant="bodyMedium" style={styles.actionText}>Add Stock</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => router.push('/options-chain/SPY')}
                >
                  <Surface style={styles.actionIconContainer} elevation={3}>
                    <MaterialCommunityIcons 
                      name="chart-timeline-variant" 
                      size={32} 
                      color={paperTheme.colors.primary} 
                    />
                  </Surface>
                  <Text variant="bodyMedium" style={styles.actionText}>Options Chain</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => {/* Research */}}
                >
                  <Surface style={styles.actionIconContainer} elevation={3}>
                    <MaterialCommunityIcons 
                      name="magnify" 
                      size={32} 
                      color={paperTheme.colors.primary} 
                    />
                  </Surface>
                  <Text variant="bodyMedium" style={styles.actionText}>Research</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => router.push('/profile')}
                >
                  <Surface style={styles.actionIconContainer} elevation={3}>
                    <MaterialCommunityIcons 
                      name="cash-plus" 
                      size={32} 
                      color={paperTheme.colors.primary} 
                    />
                  </Surface>
                  <Text variant="bodyMedium" style={styles.actionText}>Contribute</Text>
                </TouchableOpacity>
              </View>
            </Card.Content>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Colors for pie chart
const chartColors = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
];

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  container: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 8,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  marketStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  portfolioSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  summaryItem: {
    alignItems: 'center',
  },
  allocationContainer: {
    marginBottom: 24,
  },
  chartTitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  chartCaption: {
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.7,
  },
  emptyChartContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewButton: {
    alignSelf: 'center',
  },
  divider: {
    marginVertical: 16,
  },
  contributionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contributionStatBox: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    width: '30%',
  },
  nextContributionContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    textAlign: 'center',
  }
});