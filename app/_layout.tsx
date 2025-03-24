import React, { useEffect } from 'react';
import { ThemeProvider } from '../src/provider/ThemeProvider';
import { AuthProvider } from '../src/provider/AuthProvider';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Slot, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '../src/hooks/useAuth';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Root layout for the app
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

// Navigation structure based on authentication
function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  
  useEffect(() => {
    // Hide splash screen when auth state is determined
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  // Show Slot (child route) - the auth handling will happen in _layout.tsx files
  return <Slot />;
}