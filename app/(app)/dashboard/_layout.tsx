// app/(app)/dashboard/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import { useAppTheme } from '../../../src/provider/ThemeProvider';

export default function DashboardLayout() {
  const { theme } = useAppTheme();
  
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Dashboard',
        }}
      />
      <Stack.Screen
        name="trade-recommendations"
        options={{
          title: 'Trade Recommendations',
        }}
      />
      <Stack.Screen
        name="trade-strategy"
        options={{
          title: 'Trade Strategy',
        }}
      />
    </Stack>
  );
}