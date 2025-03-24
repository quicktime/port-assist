import React from "react";
import AppNavigator from "./src/navigation";
import { AuthProvider } from "./src/provider/AuthProvider";
import { ThemeProvider } from "./src/provider/ThemeProvider";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LogBox } from "react-native";

// For more info on expo-splash-screen 
// visit: https://docs.expo.dev/versions/latest/sdk/splash-screen/
import * as SplashScreen from 'expo-splash-screen';
SplashScreen.preventAutoHideAsync();

// Ignore specific warnings - only use if they can't be fixed and are non-critical
LogBox.ignoreLogs([
  "Warning: Async Storage has been extracted from react-native",
  "Setting a timer for a long period of time",
]);

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}