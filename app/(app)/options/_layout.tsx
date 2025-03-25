// app/(app)/options/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import { useAppTheme } from '../../../src/provider/ThemeProvider';

export default function OptionsLayout() {
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
          title: 'Options Portfolio',
        }}
      />
      <Stack.Screen
        name="add"
        options={{
          title: 'Add Option Position',
        }}
      />
      <Stack.Screen
        name="edit"
        options={{
          title: 'Edit Option Position',
        }}
      />
      <Stack.Screen
        name="detail"
        options={{
          title: 'Option Details',
        }}
      />
      <Stack.Screen
        name="chain/[symbol]"
        options={({ route }) => ({
          title: `Options Chain: ${route.params?.symbol || ''}`,
        })}
      />
    </Stack>
  );
}