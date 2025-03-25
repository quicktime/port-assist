// app/(app)/index.tsx (Updated version to use combined portfolio)
import React from "react";
import { useAppTheme } from "../../src/provider/ThemeProvider";
import CombinedPortfolioDashboard from "../../src/screens/Portfolio/CombinedPortfolioDashboard";

export default function HomeRoute() {
  const { isDarkMode } = useAppTheme();
  
  return <CombinedPortfolioDashboard />;
}