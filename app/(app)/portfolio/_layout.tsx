// app/(app)/portfolio/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import { useAppTheme } from '../../../src/provider/ThemeProvider';

export default function PortfolioLayout() {
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
          title: 'Stock Portfolio',
        }}
      />
      <Stack.Screen
        name="add"
        options={{
          title: 'Add Stock',
        }}
      />
      <Stack.Screen
        name="edit"
        options={{
          title: 'Edit Stock',
        }}
      />
      <Stack.Screen
        name="company/[symbol]"
        options={({ route }) => ({
          title: `Company Details: ${route.params?.symbol || ''}`,
        })}
      />
      <Stack.Screen
        name="cash"
        options={{
          title: 'Cash Management',
        }}
      />
    </Stack>
  );
}