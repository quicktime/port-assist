// src/components/OptionPrice.tsx
import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { usePolygonWebSocket } from '../hooks/usePolygonWebSocket';
import CustomText from './ui/CustomText';
import { useAppTheme } from '../provider/ThemeProvider';
import { SubscriptionPriority } from '../services/polygon';

interface OptionPriceProps {
  symbol: string;
  size?: 'small' | 'medium' | 'large';
  refreshInterval?: number;
  priority?: SubscriptionPriority;
  onPriceUpdate?: (price: number) => void;
}

const OptionPrice: React.FC<OptionPriceProps> = ({
  symbol,
  size = 'medium',
  refreshInterval = 30000, // Default to 30 seconds for options
  priority = SubscriptionPriority.LOW,
  onPriceUpdate
}) => {
  const { theme } = useAppTheme();
  
  // Ensure symbol has O: prefix for options
  const formattedSymbol = symbol.startsWith('O:') ? symbol : `O:${symbol}`;
  
  const { 
    stockData, // options data is stored in the same object 
    isConnected,
    isLoading,
    lastUpdated
  } = usePolygonWebSocket({
    symbols: [formattedSymbol],
    priority,
    refreshInterval
  });
  
  const priceData = stockData[formattedSymbol];
  const price = priceData?.price || 0;
  const timestamp = priceData?.timestamp || 0;
  
  // Callback when price updates
  useEffect(() => {
    if (price > 0 && onPriceUpdate) {
      onPriceUpdate(price);
    }
  }, [price, onPriceUpdate]);
  
  // Get font size based on component size
  const getFontSize = () => {
    switch (size) {
      case 'small': return 14;
      case 'large': return 20;
      default: return 16;
    }
  };
  
  // Determine if data is stale (more than 5 minutes old)
  const isStale = Date.now() - timestamp > 5 * 60 * 1000;
  
  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }
  
  // Placeholder when no price is available
  if (!price && !isConnected) {
    return (
      <View style={styles.container}>
        <CustomText
          variant={size === 'large' ? 'titleLarge' : size === 'small' ? 'bodySmall' : 'bodyMedium'}
          style={[styles.placeholderText, { color: theme.colors.onSurfaceDisabled }]}
        >
          --
        </CustomText>
      </View>
    );
  }
  
  // Format price with appropriate decimal places for options
  const formatPrice = (value: number): string => {
    if (value >= 10) return value.toFixed(2);
    return value.toFixed(3);
  };
  
  const fontSize = getFontSize();
  
  return (
    <View style={styles.container}>
      <CustomText
        variant={size === 'large' ? 'titleLarge' : size === 'small' ? 'bodySmall' : 'bodyMedium'}
        style={[
          styles.priceText,
          { 
            fontSize, 
            color: isStale ? theme.colors.onSurfaceDisabled : theme.colors.onSurface 
          }
        ]}
      >
        ${formatPrice(price)}
      </CustomText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    fontWeight: '500',
  },
  placeholderText: {
    fontWeight: '500',
  }
});

export default OptionPrice;