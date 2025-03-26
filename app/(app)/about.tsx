// app/(app)/about.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { useAppTheme } from "../../src/provider/ThemeProvider";
import { AboutScreen } from "../../src/screens";

export default function AboutRoute() {
  const { theme } = useAppTheme();
  
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ 
        title: "About",
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.text,
        headerShown: false, // Hide the header as BaseScreen provides its own header
      }} />
      <AboutScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});