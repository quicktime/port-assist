import React from "react";
import { useLocalSearchParams } from "expo-router";
import OptionsChainScreen from "../../../src/screens/Portfolio/OptionsChainScreen";

export default function OptionsChainRoute() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  
  if (!symbol) {
    return null;
  }
  
  return <OptionsChainScreen symbol={symbol} />;
}