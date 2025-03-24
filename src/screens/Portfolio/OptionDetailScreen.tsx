import React from "react";
import { View, ScrollView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Layout,
  Text,
  TopNav,
  themeColor,
  useTheme,
  Section,
  SectionContent,
} from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";
import { OptionData } from "../services/polygonService";
import { MainStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<MainStackParamList, "OptionDetail">;

export default function OptionDetailScreen({ route, navigation }: Props) {
  const { isDarkmode, setTheme } = useTheme();
  const { option } = route.params as { option: OptionData };

  const formatGreekValue = (value: number) => {
    if (Math.abs(value) < 0.001) {
      return value.toExponential(2);
    }
    return value.toFixed(4);
  };

  return (
    <Layout>
      <TopNav
        middleContent={`${option.underlyingSymbol} ${option.optionType === 'call' ? 'Call' : 'Put'} $${option.strikePrice}`}
        leftContent={
          <Ionicons
            name="chevron-back"
            size={20}
            color={isDarkmode ? themeColor.white100 : themeColor.dark}
          />
        }
        leftAction={() => navigation.goBack()}
        rightContent={
          <Ionicons
            name={isDarkmode ? "sunny" : "moon"}
            size={20}
            color={isDarkmode ? themeColor.white100 : themeColor.dark}
          />
        }
        rightAction={() => {
          if (isDarkmode) {
            setTheme("light");
          } else {
            setTheme("dark");
          }
        }}
      />

      <ScrollView style={{ flex: 1, padding: 20 }}>
        <Section>
          <SectionContent>
            <Text size="lg" fontWeight="bold" style={{ marginBottom: 15 }}>Option Details</Text>
            
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
              <Text>Symbol</Text>
              <Text>{option.symbol}</Text>
            </View>
            
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
              <Text>Type</Text>
              <Text style={{ textTransform: 'capitalize' }}>{option.optionType}</Text>
            </View>
            
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
              <Text>Expiration</Text>
              <Text>{option.expirationDate}</Text>
            </View>
            
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
              <Text>Strike Price</Text>
              <Text>${option.strikePrice.toFixed(2)}</Text>
            </View>
          </SectionContent>
        </Section>

        <Section style={{ marginTop: 20 }}>
          <SectionContent>
            <Text size="lg" fontWeight="bold" style={{ marginBottom: 15 }}>Market Data</Text>
            
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
              <Text>Last Price</Text>
              <Text>${option.lastPrice.toFixed(2)}</Text>
            </View>
            
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
              <Text>Bid</Text>
              <Text>${option.bidPrice.toFixed(2)}</Text>
            </View>
            
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
              <Text>Ask</Text>
              <Text>${option.askPrice.toFixed(2)}</Text>
            </View>
            
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
              <Text>Open Interest</Text>
              <Text>{option.openInterest.toLocaleString()}</Text>
            </View>
            
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
              <Text>Volume</Text>
              <Text>{option.volume.toLocaleString()}</Text>
            </View>
            
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
              <Text>Implied Volatility</Text>
              <Text>{(option.impliedVolatility * 100).toFixed(2)}%</Text>
            </View>
          </SectionContent>
        </Section>

        <Section style={{ marginTop: 20 }}>
          <SectionContent>
            <Text size="lg" fontWeight="bold" style={{ marginBottom: 15 }}>Greeks</Text>
            
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
              <Text>Delta</Text>
              <Text>{formatGreekValue(option.greeks.delta)}</Text>
            </View>
            
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
              <Text>Gamma</Text>
              <Text>{formatGreekValue(option.greeks.gamma)}</Text>
            </View>
            
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
              <Text>Theta</Text>
              <Text>{formatGreekValue(option.greeks.theta)}</Text>
            </View>
            
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
              <Text>Vega</Text>
              <Text>{formatGreekValue(option.greeks.vega)}</Text>
            </View>
            
            {option.greeks.rho !== undefined && (
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
                <Text>Rho</Text>
                <Text>{formatGreekValue(option.greeks.rho)}</Text>
              </View>
            )}
          </SectionContent>
        </Section>

        <Section style={{ marginTop: 20, marginBottom: 30 }}>
          <SectionContent>
            <Text size="lg" fontWeight="bold" style={{ marginBottom: 15 }}>What These Greeks Mean</Text>
            
            <View style={{ marginBottom: 10 }}>
              <Text fontWeight="bold">Delta ({formatGreekValue(option.greeks.delta)})</Text>
              <Text size="sm" style={{ marginTop: 5 }}>
                Rate of change of option price with respect to the underlying asset's price.
                {option.optionType === 'call' 
                  ? " Values close to 1 indicate the option moves almost one-to-one with the stock."
                  : " For puts, values close to -1 indicate stronger downside correlation."}
              </Text>
            </View>
            
            <View style={{ marginBottom: 10 }}>
              <Text fontWeight="bold">Gamma ({formatGreekValue(option.greeks.gamma)})</Text>
              <Text size="sm" style={{ marginTop: 5 }}>
                Rate of change of Delta with respect to the underlying asset's price.
                Higher values indicate the Delta can change more rapidly as the stock price moves.
              </Text>
            </View>
            
            <View style={{ marginBottom: 10 }}>
              <Text fontWeight="bold">Theta ({formatGreekValue(option.greeks.theta)})</Text>
              <Text size="sm" style={{ marginTop: 5 }}>
                Rate of time decay - how much value the option loses each day as it approaches expiration.
                Higher negative values indicate faster time decay.
              </Text>
            </View>
            
            <View style={{ marginBottom: 10 }}>
              <Text fontWeight="bold">Vega ({formatGreekValue(option.greeks.vega)})</Text>
              <Text size="sm" style={{ marginTop: 5 }}>
                Sensitivity to volatility changes. Shows how much the option's price will change for a 1% change in implied volatility.
              </Text>
            </View>
            
            {option.greeks.rho !== undefined && (
              <View>
                <Text fontWeight="bold">Rho ({formatGreekValue(option.greeks.rho)})</Text>
                <Text size="sm" style={{ marginTop: 5 }}>
                  Sensitivity to interest rate changes. Shows how much the option's price will change when interest rates change.
                </Text>
              </View>
            )}
          </SectionContent>
        </Section>
      </ScrollView>
    </Layout>
  );
}