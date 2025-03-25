// src/components/StockPrice.tsx
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { usePolygonWebSocket } from '../hooks/usePolygonWebSocket';
import CustomText from './ui/CustomText';
import { useAppTheme } from '../provider/ThemeProvider';
import { SubscriptionPriority } from '../services/polygon/webSocketService';

interface StockPriceProps {
  symbol: string;
  size?: 'small' | 'medium' | 'large';
  showChange?: boolean;
  refreshInterval?: number;
  // Pass specified priority or use default in the hook
  priority?: SubscriptionPriority; 
  onPriceUpdate?: (price: number) => void;
}

const StockPrice: React.FC<StockPriceProps> = ({
  symbol,
  size = 'medium',
  showChange = true,
  refreshInterval = 0,
  priority,
  onPriceUpdate
}) => {
  const { theme } = useAppTheme();
  
  const { 
    stockData, 
    isConnected,
    lastUpdated,
    refreshData
  } = usePolygonWebSocket({
    symbols: [symbol],
    priority,
    refreshInterval
  });
  
  const priceData = stockData[symbol];
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
      case 'small': return { price: 14, change: 12 };
      case 'large': return { price: 22, change: 16 };
      default: return { price: 18, change: 14 };
    }
  };
  
  // Determine if data is stale (more than 5 minutes old)
  const isStale = Date.now() - timestamp > 5 * 60 * 1000;
  
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
  
  // Format price with appropriate decimal places
  const formatPrice = (value: number): string => {
    if (value >= 1000) return value.toFixed(2);
    if (value >= 100) return value.toFixed(2);
    if (value >= 10) return value.toFixed(2);
    if (value >= 1) return value.toFixed(2);
    return value.toFixed(4);
  };
  
  // Format percent change
  const formatChange = (value: number): string => {
    return (value >= 0 ? '+' : '') + value.toFixed(2) + '%';
  };
  
  // Approximate change calculation (for demo purposes)
  // In a real app, you would get this from the API
  const changePercent = 0.5; // Placeholder
  
  // Determine color based on change
  const changeColor = changePercent >= 0 
    ? theme.colors.success 
    : theme.colors.error;
  
  const fontSizes = getFontSize();
  
  return (
    <View style={styles.container}>
      <CustomText
        variant={size === 'large' ? 'titleLarge' : size === 'small' ? 'bodySmall' : 'bodyMedium'}
        style={[
          styles.priceText,
          { fontSize: fontSizes.price, color: isStale ? theme.colors.onSurfaceDisabled : theme.colors.onSurface }
        ]}
      >
        ${formatPrice(price)}
      </CustomText>
      
      {showChange && (
        <CustomText
          variant={size === 'large' ? 'bodyMedium' : size === 'small' ? 'labelSmall' : 'labelMedium'}
          style={[
            styles.changeText,
            { fontSize: fontSizes.change, color: isStale ? theme.colors.onSurfaceDisabled : changeColor }
          ]}
        >
          {formatChange(changePercent)}
        </CustomText>
      )}
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
  changeText: {
    marginLeft: 8,
    fontWeight: '500',
  },
  placeholderText: {
    fontWeight: '500',
  }
});

export default StockPrice;