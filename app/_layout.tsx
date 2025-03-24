import React, { useEffect } from 'react';
import { ThemeProvider } from '../src/provider/ThemeProvider';
import { AuthProvider } from '../src/provider/AuthProvider';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '../src/hooks/useAuth';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore errors */
});

// Root layout
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <RootLayoutWithAuth />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootLayoutWithAuth() {
  const { isLoading } = useAuth();
  
  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => {
        /* ignore errors */
      });
    }
  }, [isLoading]);

  return <Slot />;
}