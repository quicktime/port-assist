// src/screens/Dashboard/RecommendationsScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import { View, ScrollView, StyleSheet, Alert, RefreshControl } from "react-native";
import {
  Text,
  Card,
  Button,
  Chip,
  Divider,
  List,
  IconButton,
  useTheme,
  ActivityIndicator,
  Surface,
  ProgressBar,
  DataTable,
  TouchableRipple
} from "react-native-paper";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getTradeRecommendations, TradeRecommendation, TradeRecommendationsResponse } from "../../services/claude";
import { getTradeStrategy } from "../../services/strategy";
import { getPortfolioWithCurrentPrices, getPortfolioSummary } from "../../services/portfolio";
import { BaseScreen, LoadingScreen, commonStyles } from "../index";

export default function RecommendationsScreen() {
  const paperTheme = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recommendations, setRecommendations] = useState<TradeRecommendationsResponse | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [generatingNewRecommendations, setGeneratingNewRecommendations] = useState(false);
  
  useEffect(() => {
    loadRecommendations();
  }, []);
  
  const loadRecommendations = async () => {
    try {
      setLoading(true);
      
      // Get portfolio data
      const portfolio = await getPortfolioWithCurrentPrices();
      const portfolioSummary = await getPortfolioSummary();
      
      // Get strategy preferences
      const strategy = await getTradeStrategy();
      
      // Generate recommendations
      const recommendations = await getTradeRecommendations(
        portfolio,
        portfolioSummary.totalValue * 0.1, // Assuming 10% of portfolio value is cash
        strategy
      );
      
      setRecommendations(recommendations);
    } catch (error) {
      console.error("Error generating trade recommendations:", error);
      Alert.alert("Error", "Failed to generate trade recommendations");
    } finally {
      setLoading(false);
    }
  };
  
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecommendations();
    setRefreshing(false);
  }, []);
  
  const generateNewRecommendations = async () => {
    try {
      setGeneratingNewRecommendations(true);
      await loadRecommendations();
    } catch (error) {
      console.error("Error generating new recommendations:", error);
      Alert.alert("Error", "Failed to generate new recommendations");
    } finally {
      setGeneratingNewRecommendations(false);
    }
  };
  
  const toggleExpandCard = (id: string) => {
    setExpandedCard(expandedCard === id ? null : id);
  };
  
  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low':
        return paperTheme.colors.primary;
      case 'moderate':
        return '#FFA000';
      case 'high':
        return paperTheme.colors.error;
      default:
        return paperTheme.colors.primary;
    }
  };
  
  const getActionIcon = (action: string, type: string) => {
    if (action === 'buy') {
      return type.includes('call') ? 'call-made' : type.includes('put') ? 'call-received' : 'arrow-up-bold';
    } else {
      return type.includes('call') ? 'call-received' : type.includes('put') ? 'call-made' : 'arrow-down-bold';
    }
  };
  
  const getActionColor = (action: string) => {
    return action === 'buy' ? paperTheme.colors.primary : paperTheme.colors.error;
  };
  
  // Safe format function that handles non-number values
  const safeNumberFormat = (value: any, decimals: number = 2): string => {
    // Check if value is a valid number
    if (typeof value === 'number' && !isNaN(value)) {
      return value.toFixed(decimals);
    } else if (typeof value === 'string' && !isNaN(Number(value))) {
      // Try to convert string to number
      return Number(value).toFixed(decimals);
    }
    // Return a dash for invalid values
    return '-';
  };
  
  if (loading) {
    return (
      <LoadingScreen 
        title="Trade Recommendations" 
        message="Generating trade recommendations... Analyzing your portfolio, market data, and options chains"
      />
    );
  }
  
  return (
    <BaseScreen 
      title="Trade Recommendations" 
      showBackButton={true} 
      onBack={() => router.back()}
    >
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
        {recommendations && (
          <>
            <Surface style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Text variant="titleMedium">Generated Recommendations</Text>
                <Text variant="bodySmall">
                  {new Date(recommendations.timestamp).toLocaleString()}
                </Text>
              </View>
              
              <Divider style={styles.divider} />
              
              <View style={styles.infoSection}>
                <Text variant="titleSmall">Market Overview</Text>
                <Text variant="bodyMedium" style={styles.infoText}>
                  {recommendations.marketOverview}
                </Text>
              </View>
              
              <Divider style={styles.divider} />
              
              <View style={styles.infoSection}>
                <Text variant="titleSmall">Portfolio Analysis</Text>
                <Text variant="bodyMedium" style={styles.infoText}>
                  {recommendations.portfolioAnalysis}
                </Text>
              </View>
              
              <Divider style={styles.divider} />
              
              <View style={styles.infoSection}>
                <Text variant="titleSmall">Cash Recommendation</Text>
                <Text variant="bodyMedium" style={styles.infoText}>
                  {recommendations.cashRecommendation}
                </Text>
              </View>
            </Surface>
            
            <View style={styles.sectionHeader}>
              <Text variant="titleLarge">Trade Recommendations</Text>
            </View>
            
            {recommendations.recommendations && recommendations.recommendations.length > 0 ? (
              recommendations.recommendations.map((recommendation, index) => (
                <Card 
                  key={index} 
                  style={styles.recommendationCard}
                  mode="elevated"
                >
                  <TouchableRipple
                    onPress={() => toggleExpandCard(`rec_${index}`)}
                    rippleColor="rgba(0, 0, 0, .12)"
                  >
                    <Card.Content>
                      <View style={styles.cardHeader}>
                        <View style={styles.symbolContainer}>
                          <Text variant="titleLarge">{recommendation.symbol}</Text>
                          <Chip 
                            mode="outlined" 
                            style={[styles.riskChip, { borderColor: getRiskLevelColor(recommendation.riskLevel) }]}
                            textStyle={{ color: getRiskLevelColor(recommendation.riskLevel) }}
                          >
                            {recommendation.riskLevel.toUpperCase()} RISK
                          </Chip>
                        </View>
                        <IconButton
                          icon={expandedCard === `rec_${index}` ? "chevron-up" : "chevron-down"}
                          size={24}
                          onPress={() => toggleExpandCard(`rec_${index}`)}
                        />
                      </View>
                      
                      <View style={styles.actionContainer}>
                        <MaterialCommunityIcons
                          name={getActionIcon(recommendation.action, recommendation.type)}
                          size={24}
                          color={getActionColor(recommendation.action)}
                          style={styles.actionIcon}
                        />
                        <Text
                          variant="titleMedium"
                          style={{ color: getActionColor(recommendation.action) }}
                        >
                          {recommendation.action.toUpperCase()} {recommendation.type.toUpperCase()}
                        </Text>
                      </View>
                      
                      <Text variant="bodyMedium" style={styles.detailsText}>
                        {recommendation.details}
                      </Text>
                      
                      {expandedCard === `rec_${index}` && (
                        <View style={styles.expandedContent}>
                          <Divider style={styles.divider} />
                          
                          <DataTable>
                            <DataTable.Header>
                              <DataTable.Title>Parameter</DataTable.Title>
                              <DataTable.Title numeric>Value</DataTable.Title>
                            </DataTable.Header>
                            
                            <DataTable.Row>
                              <DataTable.Cell>Quantity</DataTable.Cell>
                              <DataTable.Cell numeric>{recommendation.quantity}</DataTable.Cell>
                            </DataTable.Row>
                            
                            <DataTable.Row>
                              <DataTable.Cell>Estimated Cost</DataTable.Cell>
                              <DataTable.Cell numeric>
                                ${safeNumberFormat(recommendation.estimatedCost)}
                              </DataTable.Cell>
                            </DataTable.Row>
                            
                            {recommendation.strike !== undefined && (
                              <DataTable.Row>
                                <DataTable.Cell>Strike Price</DataTable.Cell>
                                <DataTable.Cell numeric>
                                  ${safeNumberFormat(recommendation.strike)}
                                </DataTable.Cell>
                              </DataTable.Row>
                            )}
                            
                            {recommendation.expiration && (
                              <DataTable.Row>
                                <DataTable.Cell>Expiration</DataTable.Cell>
                                <DataTable.Cell numeric>{recommendation.expiration}</DataTable.Cell>
                              </DataTable.Row>
                            )}
                            
                            {recommendation.stopLoss !== undefined && (
                              <DataTable.Row>
                                <DataTable.Cell>Stop Loss</DataTable.Cell>
                                <DataTable.Cell numeric>
                                  ${safeNumberFormat(recommendation.stopLoss)}
                                </DataTable.Cell>
                              </DataTable.Row>
                            )}
                            
                            {recommendation.takeProfit !== undefined && (
                              <DataTable.Row>
                                <DataTable.Cell>Take Profit</DataTable.Cell>
                                <DataTable.Cell numeric>
                                  ${safeNumberFormat(recommendation.takeProfit)}
                                </DataTable.Cell>
                              </DataTable.Row>
                            )}
                          </DataTable>
                          
                          <Divider style={styles.divider} />
                          
                          <View style={styles.reasoningSection}>
                            <Text variant="titleSmall">Reasoning</Text>
                            <Text variant="bodyMedium" style={styles.reasoningText}>
                              {recommendation.reasoning}
                            </Text>
                          </View>
                        </View>
                      )}
                    </Card.Content>
                  </TouchableRipple>
                </Card>
              ))
            ) : (
              <Surface style={styles.noRecommendationsCard}>
                <MaterialCommunityIcons
                  name="information-outline"
                  size={48}
                  color={paperTheme.colors.primary}
                  style={styles.noRecommendationsIcon}
                />
                <Text variant="titleMedium" style={styles.noRecommendationsText}>
                  No trade recommendations at this time
                </Text>
                <Text variant="bodyMedium" style={styles.noRecommendationsSubtext}>
                  Based on your portfolio and current market conditions, we don't have any specific trade recommendations. 
                  This could be because market conditions aren't favorable, or your current positions are optimal.
                </Text>
              </Surface>
            )}
            
            <Button
              mode="contained"
              onPress={generateNewRecommendations}
              loading={generatingNewRecommendations}
              icon="refresh"
              style={styles.generateButton}
            >
              Generate New Recommendations
            </Button>
            
            <Button
              mode="outlined"
              onPress={() => router.push("/(app)/dashboard/trade-strategy")}
              icon="cog-outline"
              style={styles.strategyButton}
            >
              Update Trading Strategy
            </Button>
          </>
        )}
      </ScrollView>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoSection: {
    marginVertical: 8,
  },
  infoText: {
    marginTop: 4,
  },
  divider: {
    marginVertical: 12,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  recommendationCard: {
    margin: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  symbolContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskChip: {
    marginLeft: 8,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  actionIcon: {
    marginRight: 8,
  },
  detailsText: {
    marginTop: 8,
  },
  expandedContent: {
    marginTop: 8,
  },
  reasoningSection: {
    marginTop: 8,
  },
  reasoningText: {
    marginTop: 4,
  },
  noRecommendationsCard: {
    margin: 16,
    padding: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  noRecommendationsIcon: {
    marginBottom: 16,
  },
  noRecommendationsText: {
    marginBottom: 8,
    textAlign: 'center',
  },
  noRecommendationsSubtext: {
    textAlign: 'center',
  },
  generateButton: {
    margin: 16,
    marginTop: 8,
  },
  strategyButton: {
    marginHorizontal: 16,
    marginBottom: 24,
  }
});