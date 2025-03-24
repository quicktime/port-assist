import React, { useState } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { MainStackParamList } from "../types/navigation";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { supabase } from "../initSupabase";
import {
  Layout,
  Text,
  Button,
  TextInput,
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
  const [contributionAmount, setContributionAmount] = useState("777");
  const [targetDate, setTargetDate] = useState("2025-12-31");
  
  // In a real app, these would be stored in the database and retrieved from there
  const [monthlyContributions, setMonthlyContributions] = useState([
    { date: "2024-01-01", amount: 777, status: "completed" },
    { date: "2024-02-01", amount: 777, status: "completed" },
    { date: "2024-03-01", amount: 777, status: "completed" },
    { date: "2024-04-01", amount: 777, status: "upcoming" },
    { date: "2024-05-01", amount: 777, status: "upcoming" },
  ]);

  const addContribution = () => {
    // In a real app, this would add a new contribution to the database
    Alert.alert("Success", "New contribution added to your plan");
  };

  const markAsCompleted = (index: number) => {
    // In a real app, this would update the contribution status in the database
    const updatedContributions = [...monthlyContributions];
    updatedContributions[index].status = "completed";
    setMonthlyContributions(updatedContributions);
  };

  const totalContributed = monthlyContributions
    .filter(item => item.status === "completed")
    .reduce((sum, item) => sum + item.amount, 0);

  const remainingMonths = monthlyContributions
    .filter(item => item.status === "upcoming").length;

  return (
    <Layout>
      <TopNav
        middleContent="Profile & Investment Plan"
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
      
      <ScrollView style={{ flex: 1 }}>
        <View style={styles.container}>
          <Section>
            <SectionContent>
              <Text fontWeight="bold" size="h4" style={{ marginBottom: 10 }}>Account Information</Text>
              
              <View style={styles.profileInfo}>
                <View style={styles.profileAvatar}>
                  <Ionicons
                    name="person-circle"
                    size={80}
                    color={isDarkmode ? themeColor.white100 : themeColor.dark}
                  />
                </View>
                
                <View style={styles.profileDetails}>
                  <Text fontWeight="bold" size="lg">
                    {supabase.auth.user()?.email || "User"}
                  </Text>
                  <Text size="sm" style={{ marginTop: 5 }}>
                    Member since {new Date(supabase.auth.user()?.created_at || Date.now()).toLocaleDateString()}
                  </Text>
                  <Text size="sm" style={{ marginTop: 5 }}>
                    Roth IRA
                  </Text>
                </View>
              </View>
            </SectionContent>
          </Section>

          <Section style={{ marginTop: 20 }}>
            <SectionContent>
              <Text fontWeight="bold" size="h4" style={{ marginBottom: 10 }}>Investment Plan</Text>
              
              <View style={styles.planStats}>
                <View style={styles.statBox}>
                  <Text fontWeight="bold">Monthly</Text>
                  <Text size="xl">${contributionAmount}</Text>
                </View>
                
                <View style={styles.statBox}>
                  <Text fontWeight="bold">Contributed</Text>
                  <Text size="xl">${totalContributed}</Text>
                </View>
                
                <View style={styles.statBox}>
                  <Text fontWeight="bold">Remaining</Text>
                  <Text size="xl">{remainingMonths} months</Text>
                </View>
              </View>

              <View style={styles.planSettings}>
                <View style={{ marginBottom: 15 }}>
                  <Text style={{ marginBottom: 5 }}>Contribution Amount</Text>
                  <TextInput
                    placeholder="Monthly contribution amount"
                    value={contributionAmount}
                    onChangeText={setContributionAmount}
                    keyboardType="decimal-pad"
                  />
                </View>
                
                <View style={{ marginBottom: 15 }}>
                  <Text style={{ marginBottom: 5 }}>Target End Date</Text>
                  <TextInput
                    placeholder="Target end date (YYYY-MM-DD)"
                    value={targetDate}
                    onChangeText={setTargetDate}
                  />
                </View>
                
                <Button
                  text="Update Plan"
                  status="primary"
                  onPress={() => Alert.alert("Success", "Investment plan updated")}
                  style={{ marginTop: 10 }}
                />
              </View>
            </SectionContent>
          </Section>

          <Section style={{ marginTop: 20, marginBottom: 30 }}>
            <SectionContent>
              <Text fontWeight="bold" size="h4" style={{ marginBottom: 10 }}>Contribution Schedule</Text>
              
              <View style={styles.contributionList}>
                {monthlyContributions.map((contribution, index) => (
                  <View key={index} style={styles.contributionItem}>
                    <View>
                      <Text fontWeight="bold">{new Date(contribution.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}</Text>
                      <Text size="sm">${contribution.amount}</Text>
                    </View>
                    
                    {contribution.status === "completed" ? (
                      <View style={styles.completedBadge}>
                        <Text size="sm" style={{ color: "white" }}>Completed</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.markCompletedButton}
                        onPress={() => markAsCompleted(index)}
                      >
                        <Text size="sm" style={{ color: "white" }}>Mark as Completed</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
              
              <Button
                text="Add New Contribution"
                status="info"
                onPress={addContribution}
                style={{ marginTop: 15 }}
              />
            </SectionContent>
          </Section>
        </View>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileAvatar: {
    marginRight: 20,
  },
  profileDetails: {
    flex: 1,
  },
  planStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statBox: {
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.05)",
    minWidth: "30%",
  },
  planSettings: {
    marginTop: 10,
  },
  contributionList: {
    marginTop: 5,
  },
  contributionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  completedBadge: {
    backgroundColor: "green",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  markCompletedButton: {
    backgroundColor: "blue",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
});