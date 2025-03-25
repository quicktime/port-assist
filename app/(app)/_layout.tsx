// app/(app)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { Redirect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/provider/ThemeProvider';

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const { theme } = useAppTheme();
  
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
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard" color={color} size={size} />
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
        name="options"
        options={{
          title: "Options",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-timeline-variant" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" color={color} size={size} />
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
      
      {/* Hide these screens from tab bar */}
      <Tabs.Screen
        name="about"
        options={{
          href: null, // Prevents the tab from appearing in the tab bar
        }}
      />
      <Tabs.Screen
        name="company-details"
        options={{
          href: null, // Prevents the tab from appearing in the tab bar
        }}
      />
      <Tabs.Screen
        name="options-chain"
        options={{
          href: null, // Prevents the tab from appearing in the tab bar
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          href: null, // Prevents the tab from appearing in the tab bar
        }}
      />
    </Tabs>
  );
}