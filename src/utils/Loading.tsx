import React from "react";
import { View } from "react-native";
import { ActivityIndicator, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Loading() {
  const theme = useTheme();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator 
          size="large" 
          color={theme.colors.primary} 
        />
      </View>
    </SafeAreaView>
  );
}