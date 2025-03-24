// app/_layout.tsx
import React from 'react';
import { View } from 'react-native';
import { ThemeProvider } from '../src/provider/ThemeProvider';
import { AuthProvider } from '../src/provider/AuthProvider';
import { PolygonWebSocketProvider, usePolygonWebSocket } from '../src/provider/PolygonWebSocketProvider';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '../src/hooks/useAuth';
import { useEffect } from 'react';
import ConnectionStatus from '../src/components/ConnectionStatus';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Root layout for the app
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <PolygonWebSocketProvider>
            <RootLayoutNav />
          </PolygonWebSocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

// Navigation structure based on authentication
function RootLayoutNav() {
  const { isLoading } = useAuth();
  const { isConnected } = usePolygonWebSocket();
  
  useEffect(() => {
    // Hide splash screen when auth state is determined
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  return (
    <View style={{ flex: 1 }}>
      {/* Only show connection status when authenticated */}
      {!isLoading && isConnected !== undefined && (
        <ConnectionStatus autoHide={true} />
      )}
      <Slot />
    </View>
  );
}