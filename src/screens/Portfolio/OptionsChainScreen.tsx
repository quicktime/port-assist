import React, { useState, useEffect } from "react";
import { View, ScrollView, ActivityIndicator, FlatList, TouchableOpacity, Text as RNText, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Layout,
  Text,
  TopNav,
  themeColor,
  useTheme,
  Button,
  Section,
  SectionContent,
  Select,
} from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";
import { fetchOptionsData, fetchOptionsExpirations, fetchStockPrice, OptionData } from "../services/polygonService";
import { MainStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<MainStackParamList, "OptionsChain">;

export default function OptionsChainScreen({ route, navigation }: Props) {
  const { isDarkmode, setTheme } = useTheme();
  const { symbol } = route.params as { symbol: string };
  
  const [stockPrice, setStockPrice] = useState<number | null>(null);
  const [optionType, setOptionType] = useState<'call' | 'put'>('call');
  const [expirationDates, setExpirationDates] = useState<string[]>([]);
  const [selectedExpiration, setSelectedExpiration] = useState<string>('');
  const [options, setOptions] = useState<OptionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Fetch current stock price
        const stockData = await fetchStockPrice(symbol);
        setStockPrice(stockData.currentPrice);
        
        // Fetch available expiration dates
        const dates = await fetchOptionsExpirations(symbol);
        setExpirationDates(dates);
        
        if (dates.length > 0) {
          setSelectedExpiration(dates[0]);
          await loadOptionsData(dates[0]);
        }
      } catch (error) {
        console.error("Error loading options data:", error);
        Alert.alert("Error", "Failed to load options data");
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [symbol]);

  const loadOptionsData = async (expDate: string) => {
    setLoadingOptions(true);
    try {
      const optionsData = await fetchOptionsData(symbol, expDate);
      setOptions(optionsData);
    } catch (error) {
      console.error("Error loading options chain:", error);
      Alert.alert("Error", "Failed to load options chain");
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleExpirationChange = async (expDate: string) => {
    setSelectedExpiration(expDate);
    await loadOptionsData(expDate);
  };

  const handleOptionTypeChange = (type: 'call' | 'put') => {
    setOptionType(type);
  };

  const filteredOptions = options.filter(option => 
    option.optionType === optionType
  ).sort((a, b) => a.strikePrice - b.strikePrice);

  const renderOptionItem = ({ item }: { item: OptionData }) => {
    const inTheMoney = optionType === 'call' 
      ? item.strikePrice < (stockPrice || 0)
      : item.strikePrice > (stockPrice || 0);
    
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate("OptionDetail", { option: item })}
        style={{
          padding: 10,
          borderBottomWidth: 1,
          borderBottomColor: isDarkmode ? themeColor.dark300 : themeColor.light200,
          backgroundColor: inTheMoney 
            ? (isDarkmode ? 'rgba(46, 125, 50, 0.2)' : 'rgba(46, 125, 50, 0.1)')
            : 'transparent',
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text fontWeight="bold">${item.strikePrice.toFixed(2)}</Text>
          <Text>${item.lastPrice.toFixed(2)}</Text>
        </View>
        
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 5 }}>
          <Text size="sm">Bid: ${item.bidPrice.toFixed(2)}</Text>
          <Text size="sm">Ask: ${item.askPrice.toFixed(2)}</Text>
        </View>
        
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 5 }}>
          <Text size="sm">OI: {item.openInterest}</Text>
          <Text size="sm">Vol: {item.volume}</Text>
          <Text size="sm">IV: {(item.impliedVolatility * 100).toFixed(1)}%</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <Layout>
        <TopNav
          middleContent={`${symbol} Options`}
          leftContent={
            <Ionicons
              name="chevron-back"
              size={20}
              color={isDarkmode ? themeColor.white100 : themeColor.dark}
            />
          }
          leftAction={() => navigation.goBack()}
        />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={themeColor.primary} />
          <Text style={{ marginTop: 10 }}>Loading options data...</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout>
      <TopNav
        middleContent={`${symbol} Options`}
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

      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 20 }}>
          <Section>
            <SectionContent>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text size="lg" fontWeight="bold">{symbol}</Text>
                <Text size="lg">${stockPrice?.toFixed(2) || "N/A"}</Text>
              </View>
            </SectionContent>
          </Section>

          <View style={{ marginTop: 20 }}>
            <Text fontWeight="bold" style={{ marginBottom: 10 }}>Expiration Date</Text>
            <Select
              items={expirationDates.map(date => ({ label: date, value: date }))}
              value={selectedExpiration}
              placeholder="Select expiration date"
              onValueChange={(value) => handleExpirationChange(value)}
            />
          </View>

          <View style={{ marginTop: 20, flexDirection: "row", justifyContent: "space-between" }}>
            <Button
              text="Calls"
              status={optionType === 'call' ? "primary" : "basic"}
              style={{ flex: 1, marginRight: 10 }}
              onPress={() => handleOptionTypeChange('call')}
            />
            <Button
              text="Puts"
              status={optionType === 'put' ? "primary" : "basic"}
              style={{ flex: 1 }}
              onPress={() => handleOptionTypeChange('put')}
            />
          </View>

          <View style={{ marginTop: 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 10, backgroundColor: isDarkmode ? themeColor.dark200 : themeColor.gray100 }}>
              <Text fontWeight="bold">Strike</Text>
              <Text fontWeight="bold">Last</Text>
            </View>

            {loadingOptions ? (
              <View style={{ padding: 20, alignItems: "center" }}>
                <ActivityIndicator size="small" color={themeColor.primary} />
                <Text style={{ marginTop: 10 }}>Loading options...</Text>
              </View>
            ) : filteredOptions.length > 0 ? (
              <FlatList
                data={filteredOptions}
                renderItem={renderOptionItem}
                keyExtractor={(item) => item.symbol}
                scrollEnabled={false}
              />
            ) : (
              <View style={{ padding: 20, alignItems: "center" }}>
                <Text>No options available for this selection</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </Layout>
  );
}