
import React from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { useAppTheme } from "../../src/provider/ThemeProvider";
import PortfolioScreen from "../../src/screens/Portfolio/PortfolioScreen";

export default function PortfolioRoute() {
  const { isDarkMode } = useAppTheme();
  
  return <PortfolioScreen />;
}