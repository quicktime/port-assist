// app/(app)/profile.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { useAppTheme } from "../../src/provider/ThemeProvider";
import { ProfileScreen } from "../../src/screens";

export default function ProfileRoute() {
  const { theme } = useAppTheme();
  
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ 
        title: "Profile",
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.text,
        headerShown: false, // Hide header as BaseScreen provides its own
      }} />
      <ProfileScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});