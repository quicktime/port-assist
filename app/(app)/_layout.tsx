import React from 'react';
import { Tabs } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { Redirect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/provider/ThemeProvider';

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const { isDarkMode, theme } = useAppTheme();
  
  // If the user is not authenticated and not loading, redirect to login
  if (!isAuthenticated && !isLoading) {
    return <Redirect href="/(auth)/login" />;
  }
  
  // If still loading auth state, you could show a loading screen
  if (isLoading) {
    return null;
  }

  // Main app tabs
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          borderTopColor: isDarkMode ? theme.colors.backdrop : "#c0c0c0",
          backgroundColor: isDarkMode ? theme.colors.elevation.level2 : "#ffffff",
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: isDarkMode ? "#aaaaaa" : "#777777",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: "Portfolio",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-line" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: "About",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="information" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}