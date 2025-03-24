import React from "react";
import { useLocalSearchParams } from "expo-router";
import CompanyDetailsScreen from "../../../src/screens/Portfolio/CompanyDetailsScreen";

export default function CompanyDetailsRoute() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  
  if (!symbol) {
    return null;
  }
  
  return <CompanyDetailsScreen symbol={symbol as string} />;}