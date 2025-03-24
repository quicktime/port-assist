import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// Import screens for tabs
import Home from "../screens/Home";
import PortfolioScreen from "../screens/Portfolio/PortfolioScreen";
import Profile from "../screens/Profile";
import About from "../screens/About";

import { useAppTheme } from "../provider/ThemeProvider";
import { MainTabsParamList } from "../types/navigation";

// Create a properly typed bottom tab navigator
const Tabs = createBottomTabNavigator<MainTabsParamList>();

const MainTabs = () => {
  const paperTheme = useTheme();
  const { isDarkMode } = useAppTheme();
 
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          borderTopColor: isDarkMode ? paperTheme.colors.backdrop : "#c0c0c0",
          backgroundColor: isDarkMode ? paperTheme.colors.elevation.level2 : "#ffffff",
        },
        tabBarActiveTintColor: paperTheme.colors.primary,
        tabBarInactiveTintColor: isDarkMode ? "#aaaaaa" : "#777777",
      }}
    >
      <Tabs.Screen
        name="Home"
        component={Home}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="Portfolio"
        component={PortfolioScreen}
        options={{
          tabBarLabel: "Portfolio",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-line" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="Profile"
        component={Profile}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="About"
        component={About}
        options={{
          tabBarLabel: "About",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="information" color={color} size={size} />
          ),
        }}
      />
    </Tabs.Navigator>
  );
};

export default MainTabs;