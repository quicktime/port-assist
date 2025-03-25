// app/(app)/_layout.tsx (Updated version)
import React from 'react';
import { Tabs } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { Redirect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/provider/ThemeProvider';

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const { isDarkMode, theme } = useAppTheme();
  
  // If not authenticated, redirect to login
  if (!isAuthenticated && !isLoading) {
    return <Redirect href="/(auth)/login" />;
  }
  
  // If still loading, return nothing
  if (isLoading) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
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
          title: "Stocks",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-line" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="options-portfolio"
        options={{
          title: "Options",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-timeline-variant" color={color} size={size} />
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