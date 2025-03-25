// src/components/PortfolioCard.tsx
import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card } from 'react-native-paper';
import { useAppTheme } from '../provider/ThemeProvider';
import CustomText from './ui/CustomText';
import { PortfolioItem } from '../services/portfolio';
import StockPrice from './StockPrice';
import { SubscriptionPriority } from '../services/polygon';
import { router } from 'expo-router';

interface PortfolioCardProps {
  item: PortfolioItem;
  onPress?: () => void;
}

const PortfolioCard: React.FC<PortfolioCardProps> = ({ item, onPress }) => {
  const { theme } = useAppTheme();
  
  // Calculate and memoize portfolio metrics
  const metrics = useMemo(() => {
    const value = (item.current_price || 0) * item.shares;
    const cost = item.avg_price * item.shares;
    const profit = value - cost;
    const profitPercent = cost > 0 ? (profit / cost) * 100 : 0;
    
    return {
      value,
      cost,
      profit,
      profitPercent
    };
  }, [item]);
  
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  
  // Format percent
  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };
  
  // Handle card press
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // Navigate to company details when pressed
      router.push(`/portfolio/company/${item.symbol}`);
    }
  };
  
  return (
    <Card
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      onPress={handlePress}
    >
      <Card.Content style={styles.content}>
        <View style={styles.header}>
          <View style={styles.symbolContainer}>
            <CustomText variant="titleMedium" weight="bold">
              {item.symbol}
            </CustomText>
            <CustomText 
              variant="bodySmall" 
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {item.shares} shares
            </CustomText>
          </View>
          
          <View style={styles.priceContainer}>
            <StockPrice 
              symbol={item.symbol} 
              size="medium" 
              showChange={false}
              priority={SubscriptionPriority.HIGH}
            />
            <View style={styles.costBasis}>
              <CustomText 
                variant="bodySmall" 
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Cost: {formatCurrency(metrics.cost)}
              </CustomText>
            </View>
          </View>
        </View>
        
        <View style={styles.footer}>
          <View style={styles.valueContainer}>
            <CustomText variant="bodyMedium">
              {formatCurrency(metrics.value)}
            </CustomText>
            <CustomText 
              variant="bodySmall" 
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Value
            </CustomText>
          </View>
          
          <View style={styles.profitContainer}>
            <CustomText
              variant="bodyMedium"
              style={{ 
                color: metrics.profit >= 0 ? theme.colors.success : theme.colors.error
              }}
            >
              {formatCurrency(metrics.profit)}
            </CustomText>
            <CustomText
              variant="bodySmall"
              style={{ 
                color: metrics.profit >= 0 ? theme.colors.success : theme.colors.error
              }}
            >
              {formatPercent(metrics.profitPercent)}
            </CustomText>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    elevation: 2,
    borderRadius: 12,
  },
  content: {
    padding: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  symbolContainer: {
    flex: 1,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  costBasis: {
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valueContainer: {},
  profitContainer: {
    alignItems: 'flex-end',
  },
});

export default PortfolioCard;