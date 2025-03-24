
import React from "react";
import { View } from "react-native";
import { supabase } from "../../src/initSupabase";
import {
  Appbar,
  Text,
  Button,
  Surface,
  useTheme
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../../src/provider/ThemeProvider";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../../src/hooks/useAuth";

export default function Home() {
  const paperTheme = useTheme();
  const { isDarkMode, toggleTheme } = useAppTheme();
  const { signOut } = useAuth();

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <Appbar.Header>
        <Appbar.Content title="Investment Portfolio Tracker" />
        <Appbar.Action
          icon={isDarkMode ? "white-balance-sunny" : "weather-night"}
          onPress={toggleTheme}
        />
      </Appbar.Header>

      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <Surface style={{ width: '100%', padding: 16, borderRadius: 8, elevation: 4 }}>
          <Text variant="titleLarge" style={{ textAlign: "center", marginBottom: 10 }}>
            Investment Portfolio Tracker
          </Text>
          <Text variant="bodyMedium" style={{ textAlign: "center", marginBottom: 20 }}>
            Track your investments, monitor options data with greeks, and analyze your portfolio performance.
          </Text>
         
          <Button
            mode="contained"
            onPress={() => router.push('/(app)/portfolio')}
            style={{ marginTop: 10 }}
            icon={({ size, color }) => (
              <MaterialCommunityIcons name="chart-line" size={size} color={color} />
            )}
          >
            View Portfolio
          </Button>
         
          <Button
            mode="contained-tonal"
            onPress={() => router.push('/(app)/options-chain/SPY')}
            style={{ marginTop: 10 }}
            icon={({ size, color }) => (
              <MaterialCommunityIcons name="chart-timeline-variant" size={size} color={color} />
            )}
          >
            View Options Chain
          </Button>

          <Button
            mode="contained-tonal"
            onPress={() => router.push('/(app)/add-stock')}
            style={{ marginTop: 10 }}
            icon={({ size, color }) => (
              <MaterialCommunityIcons name="plus-circle-outline" size={size} color={color} />
            )}
          >
            Add New Stock
          </Button>
         
          <Button
            mode="outlined"
            onPress={async () => {
              if (signOut) {
                await signOut();
              }
            }}
            style={{ marginTop: 30 }}
            icon={({ size, color }) => (
              <MaterialCommunityIcons name="logout" size={size} color={color} />
            )}
          >
            Logout
          </Button>
        </Surface>
      </View>
    </SafeAreaView>
  );
}