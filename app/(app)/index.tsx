// app/(app)/index.tsx
import React from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { useAppTheme } from "../../src/provider/ThemeProvider";
import Dashboard from "../../src/screens/Portfolio/Dashboard";

export default function HomeRoute() {
  const { isDarkMode } = useAppTheme();
  
  return <Dashboard />;
}