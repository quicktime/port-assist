// src/screens/Portfolio/OptionDetailScreen.tsx
import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import {
  Appbar,
  Text,
  Card,
  useTheme,
  Divider,
  List,
  Chip,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { OptionData } from "../services/polygonService";
import { useAppTheme } from "../../provider/ThemeProvider";
import { router } from "expo-router";

type OptionDetailScreenProps = {
  option: OptionData;
};

export default function OptionDetailScreen({ option }: OptionDetailScreenProps) {
  const { isDarkMode, toggleTheme } = useAppTheme();
  const paperTheme = useTheme();

  const formatGreekValue = (value: number) => {
    if (Math.abs(value) < 0.001) {
      return value.toExponential(2);
    }
    return value.toFixed(4);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content 
          title={
            `${option.underlyingSymbol} ${option.optionType === 'call' ? 'Call' : 'Put'} $${option.strikePrice}`
          } 
        />
        <Appbar.Action 
          icon={isDarkMode ? "white-balance-sunny" : "moon-waning-crescent"} 
          onPress={toggleTheme} 
        />
      </Appbar.Header>

      <ScrollView style={styles.scrollView}>
        <Card style={styles.card}>
          <Card.Title title="Option Details" />
          <Card.Content>
            <List.Item
              title="Symbol"
              description={option.symbol}
              left={props => <List.Icon {...props} icon="identifier" />}
            />
            <Divider />
            
            <List.Item
              title="Type"
              description={option.optionType === 'call' ? 'Call Option' : 'Put Option'}
              left={props => <List.Icon {...props} icon={option.optionType === 'call' ? 'arrow-up-bold' : 'arrow-down-bold'} />}
            />
            <Divider />
            
            <List.Item
              title="Expiration"
              description={option.expirationDate}
              left={props => <List.Icon {...props} icon="calendar" />}
            />
            <Divider />
            
            <List.Item
              title="Strike Price"
              description={`$${option.strikePrice.toFixed(2)}`}
              left={props => <List.Icon {...props} icon="currency-usd" />}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Market Data" />
          <Card.Content>
            <View style={styles.marketDataRow}>
              <View style={styles.marketDataColumn}>
                <Text variant="labelMedium">Last Price</Text>
                <Text variant="titleMedium">${option.lastPrice.toFixed(2)}</Text>
              </View>
              
              <View style={styles.marketDataColumn}>
                <Text variant="labelMedium">Bid</Text>
                <Text variant="titleMedium">${option.bidPrice.toFixed(2)}</Text>
              </View>
              
              <View style={styles.marketDataColumn}>
                <Text variant="labelMedium">Ask</Text>
                <Text variant="titleMedium">${option.askPrice.toFixed(2)}</Text>
              </View>
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.marketDataRow}>
              <View style={styles.marketDataColumn}>
                <Text variant="labelMedium">Open Interest</Text>
                <Text variant="titleMedium">{option.openInterest.toLocaleString()}</Text>
              </View>
              
              <View style={styles.marketDataColumn}>
                <Text variant="labelMedium">Volume</Text>
                <Text variant="titleMedium">{option.volume.toLocaleString()}</Text>
              </View>
              
              <View style={styles.marketDataColumn}>
                <Text variant="labelMedium">IV</Text>
                <Text variant="titleMedium">{(option.impliedVolatility * 100).toFixed(2)}%</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Greeks" />
          <Card.Content>
            <View style={styles.greeksContainer}>
              <Chip 
                icon="delta" 
                mode="outlined" 
                style={styles.greekChip}
              >
                Delta: {formatGreekValue(option.greeks.delta)}
              </Chip>
              
              <Chip 
                icon="gamma" 
                mode="outlined" 
                style={styles.greekChip}
              >
                Gamma: {formatGreekValue(option.greeks.gamma)}
              </Chip>
              
              <Chip 
                icon="clock-outline" 
                mode="outlined" 
                style={styles.greekChip}
              >
                Theta: {formatGreekValue(option.greeks.theta)}
              </Chip>
              
              <Chip 
                icon="chart-bell-curve" 
                mode="outlined" 
                style={styles.greekChip}
              >
                Vega: {formatGreekValue(option.greeks.vega)}
              </Chip>
              
              {option.greeks.rho !== undefined && (
                <Chip 
                  icon="percent" 
                  mode="outlined" 
                  style={styles.greekChip}
                >
                  Rho: {formatGreekValue(option.greeks.rho)}
                </Chip>
              )}
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="What These Greeks Mean" />
          <Card.Content>
            <List.Accordion
              title={`Delta (${formatGreekValue(option.greeks.delta)})`}
              description="Rate of change of option price with respect to the underlying asset's price"
              expanded={true}
              left={props => <List.Icon {...props} icon="delta" />}
            >
              <Text variant="bodyMedium" style={styles.greekExplanation}>
                {option.optionType === 'call' 
                  ? "Values close to 1 indicate the option moves almost one-to-one with the stock."
                  : "For puts, values close to -1 indicate stronger downside correlation."}
              </Text>
            </List.Accordion>
            
            <List.Accordion
              title={`Gamma (${formatGreekValue(option.greeks.gamma)})`}
              description="Rate of change of Delta with respect to the underlying asset's price"
              left={props => <List.Icon {...props} icon="gamma" />}
            >
              <Text variant="bodyMedium" style={styles.greekExplanation}>
                Higher values indicate the Delta can change more rapidly as the stock price moves.
              </Text>
            </List.Accordion>
            
            <List.Accordion
              title={`Theta (${formatGreekValue(option.greeks.theta)})`}
              description="Rate of time decay - how much value the option loses each day"
              left={props => <List.Icon {...props} icon="clock-outline" />}
            >
              <Text variant="bodyMedium" style={styles.greekExplanation}>
                Higher negative values indicate faster time decay as the option approaches expiration.
              </Text>
            </List.Accordion>
            
            <List.Accordion
              title={`Vega (${formatGreekValue(option.greeks.vega)})`}
              description="Sensitivity to volatility changes"
              left={props => <List.Icon {...props} icon="chart-bell-curve" />}
            >
              <Text variant="bodyMedium" style={styles.greekExplanation}>
                Shows how much the option's price will change for a 1% change in implied volatility.
              </Text>
            </List.Accordion>
            
            {option.greeks.rho !== undefined && (
              <List.Accordion
                title={`Rho (${formatGreekValue(option.greeks.rho)})`}
                description="Sensitivity to interest rate changes"
                left={props => <List.Icon {...props} icon="percent" />}
              >
                <Text variant="bodyMedium" style={styles.greekExplanation}>
                  Shows how much the option's price will change when interest rates change.
                </Text>
              </List.Accordion>
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
  scrollView: {
    flex: 1,
  },
  card: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  divider: {
    marginVertical: 16,
  },
  marketDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  marketDataColumn: {
    alignItems: 'center',
  },
  greeksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 8,
  },
  greekChip: {
    margin: 4,
  },
  greekExplanation: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  }
});