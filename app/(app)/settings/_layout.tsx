// app/(app)/settings/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import { useAppTheme } from '../../../src/provider/ThemeProvider';

export default function SettingsLayout() {
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
          title: 'Settings',
        }}
      />
      <Stack.Screen
        name="websocket"
        options={{
          title: 'WebSocket Settings',
        }}
      />
    </Stack>
  );
}