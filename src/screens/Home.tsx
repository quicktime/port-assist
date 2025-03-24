import React from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { supabase } from "../initSupabase";
import {
  Appbar,
  Text,
  Button,
  Surface,
  useTheme
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { MainStackParamList } from "../types/navigation";
import { useAppTheme } from "../provider/ThemeProvider";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import CustomText from "@/components/ui/CustomText";

type HomeScreenNavigationProp = NativeStackNavigationProp<MainStackParamList>;

const Home = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const paperTheme = useTheme();
  const { isDarkMode, toggleTheme } = useAppTheme();

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
          <CustomText variant="titleLarge" style={{ textAlign: "center", marginBottom: 10 }}>
            Investment Portfolio Tracker
          </CustomText>
          <Text variant="bodyMedium" style={{ textAlign: "center", marginBottom: 20 }}>
            Track your investments, monitor options data with greeks, and analyze your portfolio performance.
          </Text>
         
          <Button
            mode="contained"
            // Here we navigate to the Portfolio tab instead of trying to navigate to a non-existent screen
            onPress={() => navigation.navigate("MainTabs", { screen: "Portfolio" })}
            style={{ marginTop: 10 }}
            icon={({ size, color }) => (
              <MaterialCommunityIcons name="chart-line" size={size} color={color} />
            )}
          >
            View Portfolio
          </Button>
         
          <Button
            mode="contained-tonal"
            onPress={() => navigation.navigate("OptionsChain", { symbol: "SPY" })}
            style={{ marginTop: 10 }}
            icon={({ size, color }) => (
              <MaterialCommunityIcons name="chart-timeline-variant" size={size} color={color} />
            )}
          >
            View Options Chain
          </Button>

          <Button
            mode="contained-tonal"
            onPress={() => navigation.navigate("AddStock")}
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
              const { error } = await supabase.auth.signOut();
              if (!error) {
                alert("Signed out!");
              }
              if (error) {
                alert(error.message);
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
};

export default Home;