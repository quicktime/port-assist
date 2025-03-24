
import React from 'react';
import { Stack } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { Redirect } from 'expo-router';

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  
  // If the user is authenticated, redirect to the main app
  if (isAuthenticated && !isLoading) {
    return <Redirect href="/(app)" />;
  }
  
  // Auth flow stack navigator
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}