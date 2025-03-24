import React, { useState, useEffect } from "react";
import { View, StyleSheet, Platform } from "react-native";
import {
  Layout,
  Text,
  Card,
  useTheme,
  themeColor,
} from "react-native-rapi-ui";
import { LineChart, PieChart } from "react-native-chart-kit";
import { getPortfolioSummary } from "../services/portfolioService";

// This component only renders on web platform for an enhanced dashboard experience
const PortfolioDashboard = () => {
  const { isDarkmode } = useTheme();
  const [summary, setSummary] = useState({
    totalValue: 0,
    totalCost: 0,
    totalProfit: 0,
    totalProfitPercent: 0,
    items: [] as any[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getPortfolioSummary();
        setSummary(data);
      } catch (error) {
        console.error("Error loading portfolio summary:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Create chart data for allocation
  const getAllocationChartData = () => {
    return {
      labels: summary.items.map(item => item.symbol),
      datasets: [
        {
          data: summary.items.map(item => item.allocation || 0),
          color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
          strokeWidth: 2
        }
      ]
    };
  };

  // Mock performance data (in a real app, this would come from historical API data)
  const getPerformanceData = () => {
    return {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      datasets: [
        {
          data: [
            summary.totalValue * 0.95,
            summary.totalValue * 0.97,
            summary.totalValue * 0.93,
            summary.totalValue * 0.96,
            summary.totalValue * 0.98,
            summary.totalValue
          ],
          color: (opacity = 1) => isDarkmode ? `rgba(134, 247, 244, ${opacity})` : `rgba(46, 125, 50, ${opacity})`,
          strokeWidth: 2
        }
      ]
    };
  };

  const chartConfig = {
    backgroundGradientFrom: isDarkmode ? themeColor.dark200 : themeColor.white,
    backgroundGradientTo: isDarkmode ? themeColor.dark : themeColor.light100,
    decimalPlaces: 0,
    color: (opacity = 1) => isDarkmode ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => isDarkmode ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: isDarkmode ? themeColor.primary : themeColor.info,
    },
  };

  // Only render this component on web platform
  if (Platform.OS !== 'web') {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading dashboard data...</Text>
      </View>
    );
  }

  return (
    <Layout>
      <View style={styles.container}>
        <Text size="h3" fontWeight="bold" style={styles.heading}>Portfolio Dashboard</Text>
        
        <View style={styles.summaryContainer}>
          <Card style={styles.summaryCard}>
            <Text fontWeight="bold" size="h4">Total Value</Text>
            <Text size="xl">${summary.totalValue.toFixed(2)}</Text>
          </Card>
          
          <Card style={styles.summaryCard}>
            <Text fontWeight="bold" size="h4">Total Profit/Loss</Text>
            <Text 
              size="xl" 
              style={{ color: summary.totalProfit >= 0 ? 'green' : 'red' }}
            >
              {summary.totalProfit >= 0 ? '+' : ''}{summary.totalProfit.toFixed(2)} ({summary.totalProfitPercent.toFixed(2)}%)
            </Text>
          </Card>
          
          <Card style={styles.summaryCard}>
            <Text fontWeight="bold" size="h4">Cost Basis</Text>
            <Text size="xl">${summary.totalCost.toFixed(2)}</Text>
          </Card>
        </View>

        <View style={styles.chartsContainer}>
          <View style={styles.chartCard}>
            <Text fontWeight="bold" size="lg" style={styles.chartTitle}>Portfolio Allocation</Text>
            {summary.items.length > 0 && (
              <PieChart
                data={summary.items.map((item, index) => ({
                  name: item.symbol,
                  population: item.allocation || 0,
                  color: colors[index % colors.length],
                  legendFontColor: isDarkmode ? '#FFF' : '#000',
                  legendFontSize: 12,
                }))}
                width={350}
                height={220}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="10"
                absolute
              />
            )}
          </View>
          
          <View style={styles.chartCard}>
            <Text fontWeight="bold" size="lg" style={styles.chartTitle}>Performance Trend</Text>
            <LineChart
              data={getPerformanceData()}
              width={350}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
            />
          </View>
        </View>
      </View>
    </Layout>
  );
};

// Colors for pie chart
const colors = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', 
  '#FF9F40', '#8AC926', '#1982C4', '#6A4C93', '#FF595E'
];

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  heading: {
    marginBottom: 20,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryCard: {
    width: '30%',
    padding: 15,
    alignItems: 'center',
  },
  chartsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  chartCard: {
    marginBottom: 20,
    padding: 15,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  chartTitle: {
    marginBottom: 10,
    textAlign: 'center',
  },
});

export default PortfolioDashboard;