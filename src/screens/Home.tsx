import React from "react";
import { View, Linking } from "react-native";
import { MainStackParamList } from "../types/navigation";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { supabase } from "../initSupabase";
import {
  Layout,
  Button,
  Text,
  TopNav,
  Section,
  SectionContent,
  useTheme,
  themeColor,
} from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";

export default function ({
  navigation,
}: NativeStackScreenProps<MainStackParamList, "MainTabs">) {
  const { isDarkmode, setTheme } = useTheme();
  return (
    <Layout>
      <TopNav
        middleContent="Home"
        rightContent={
          <Ionicons
            name={isDarkmode ? "sunny" : "moon"}
            size={20}
            color={isDarkmode ? themeColor.white100 : themeColor.dark}
          />
        }
        rightAction={() => {
          if (isDarkmode) {
            setTheme("light");
          } else {
            setTheme("dark");
          }
        }}
      />
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <Section style={{ marginTop: 20, width: "100%" }}>
          <SectionContent>
            <Text fontWeight="bold" style={{ textAlign: "center", marginBottom: 10 }}>
              Investment Portfolio Tracker
            </Text>
            <Text style={{ textAlign: "center", marginBottom: 20 }}>
              Track your investments, monitor options data with greeks, and analyze your portfolio performance.
            </Text>
            
            <Button
              text="View Portfolio"
              status="primary"
              onPress={() => {
                navigation.navigate("Portfolio");
              }}
              style={{
                marginTop: 10,
              }}
              rightContent={
                <Ionicons name="trending-up" size={20} color={themeColor.white100} />
              }
            />
            
            <Button
              text="View Options Chain"
              status="info"
              onPress={() => {
                navigation.navigate("OptionsChain", { symbol: "SPY" });
              }}
              style={{
                marginTop: 10,
              }}
              rightContent={
                <Ionicons name="options-outline" size={20} color={themeColor.white100} />
              }
            />

            <Button
              text="Add New Stock"
              status="success"
              onPress={() => {
                navigation.navigate("AddStock");
              }}
              style={{
                marginTop: 10,
              }}
              rightContent={
                <Ionicons name="add-circle-outline" size={20} color={themeColor.white100} />
              }
            />
            
            <Button
              text="Rapi UI Documentation"
              status="info"
              onPress={() => Linking.openURL("https://rapi-ui.kikiding.space/")}
              style={{
                marginTop: 30,
              }}
            />
            
            <Button
              status="danger"
              text="Logout"
              onPress={async () => {
                const { error } = await supabase.auth.signOut();
                if (!error) {
                  alert("Signed out!");
                }
                if (error) {
                  alert(error.message);
                }
              }}
              style={{
                marginTop: 10,
              }}
            />
          </SectionContent>
        </Section>
      </View>
    </Layout>
  );
}