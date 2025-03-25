// app/(app)/profile.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { useAppTheme } from "../../src/provider/ThemeProvider";
import Profile from "../../src/screens/Profile";

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
      }} />
      <Profile />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});