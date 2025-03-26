// app/(app)/options-chain/[symbol].tsx
import React from "react";
import { useLocalSearchParams } from "expo-router";
import OptionsChainScreen from "../../../src/screens/Options/ChainScreen";

export default function OptionsChainRoute() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  
  return <OptionsChainScreen symbol={symbol} />;
}