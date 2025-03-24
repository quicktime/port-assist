// app/(app)/profile.tsx
import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { router } from "expo-router";
import { supabase } from "src/initSupabase";
import {
  Appbar,
  Text,
  Button,
  TextInput,
  Surface,
  useTheme,
  List,
  Divider
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "src/provider/ThemeProvider";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import WebSocketStatus from "src/components/WebSocketStatus";

export default function Profile() {
  const paperTheme = useTheme();
  const { isDarkMode, toggleTheme } = useAppTheme();
  const [contributionAmount, setContributionAmount] = useState("777");
  const [targetDate, setTargetDate] = useState("2025-12-31");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showWebSocketStatus, setShowWebSocketStatus] = useState(true);
  
  // Fetch user email when component mounts
  useEffect(() => {
    const getUserEmail = async () => {
      const { data } = await supabase.auth.getSession();
      setUserEmail(data.session?.user?.email || null);
    };
    
    getUserEmail();
  }, []);
  
  // Example monthly contributions data
  const [monthlyContributions, setMonthlyContributions] = useState([
    { date: "2024-01-01", amount: 777, status: "completed" },
    { date: "2024-02-01", amount: 777, status: "completed" },
    { date: "2024-03-01", amount: 777, status: "completed" },
    { date: "2024-04-01", amount: 777, status: "upcoming" },
    { date: "2024-05-01", amount: 777, status: "upcoming" },
  ]);

  const addContribution = () => {
    Alert.alert("Success", "New contribution added to your plan");
  };

  const markAsCompleted = (index: number) => {
    const updatedContributions = [...monthlyContributions];
    updatedContributions[index].status = "completed";
    setMonthlyContributions(updatedContributions);
  };

  const totalContributed = monthlyContributions
    .filter(item => item.status === "completed")
    .reduce((sum, item) => sum + item.amount, 0);

  const remainingMonths = monthlyContributions
    .filter(item => item.status === "upcoming").length;
    
  // Navigate to WebSocket settings
  const goToWebSocketSettings = () => {
    router.push('/websocket-settings');
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <Appbar.Header>
        <Appbar.Content title="Profile & Investment Plan" />
        <Appbar.Action
          icon={isDarkMode ? "white-balance-sunny" : "weather-night"}
          onPress={toggleTheme}
        />
      </Appbar.Header>
      
      <ScrollView style={{ flex: 1 }}>
        <View style={styles.container}>
          <Surface style={styles.section} elevation={2}>
            <Text variant="titleLarge" style={styles.sectionTitle}>Account Information</Text>
            
            <View style={styles.profileInfo}>
              <View style={styles.profileAvatar}>
                <MaterialCommunityIcons
                  name="account-circle"
                  size={80}
                  color={paperTheme.colors.primary}
                />
              </View>
              
              <View style={styles.profileDetails}>
                <Text variant="titleMedium">
                  {userEmail || "User"}
                </Text>
                <Text variant="bodySmall" style={{ marginTop: 5 }}>
                  Member since {new Date().toLocaleDateString()}
                </Text>
                <Text variant="bodySmall" style={{ marginTop: 5 }}>
                  Roth IRA
                </Text>
              </View>
            </View>
          </Surface>

          <Surface style={styles.section} elevation={2}>
            <Text variant="titleLarge" style={styles.sectionTitle}>Investment Plan</Text>
            
            <View style={styles.planStats}>
              <View style={styles.statBox}>
                <Text variant="labelLarge">Monthly</Text>
                <Text variant="headlineSmall">${contributionAmount}</Text>
              </View>
              
              <View style={styles.statBox}>
                <Text variant="labelLarge">Contributed</Text>
                <Text variant="headlineSmall">${totalContributed}</Text>
              </View>
              
              <View style={styles.statBox}>
                <Text variant="labelLarge">Remaining</Text>
                <Text variant="headlineSmall">{remainingMonths} months</Text>
              </View>
            </View>

            <View style={styles.planSettings}>
              <View style={{ marginBottom: 15 }}>
                <Text variant="bodyMedium" style={{ marginBottom: 5 }}>Contribution Amount</Text>
                <TextInput
                  mode="outlined"
                  label="Monthly contribution"
                  value={contributionAmount}
                  onChangeText={setContributionAmount}
                  keyboardType="decimal-pad"
                />
              </View>
              
              <View style={{ marginBottom: 15 }}>
                <Text variant="bodyMedium" style={{ marginBottom: 5 }}>Target End Date</Text>
                <TextInput
                  mode="outlined"
                  label="Target date (YYYY-MM-DD)"
                  value={targetDate}
                  onChangeText={setTargetDate}
                />
              </View>
              
              <Button
                mode="contained"
                onPress={() => Alert.alert("Success", "Investment plan updated")}
                style={{ marginTop: 10 }}
              >
                Update Plan
              </Button>
            </View>
          </Surface>
          
          {/* WebSocket Status Section */}
          <Surface style={styles.section} elevation={2}>
            <Text variant="titleLarge" style={styles.sectionTitle}>Data Connection</Text>
            
            {showWebSocketStatus && <WebSocketStatus showDetails={false} />}
            
            <List.Item
              title="Real-time Data Settings"
              description="Configure WebSocket connection preferences"
              left={props => <List.Icon {...props} icon="access-point" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={goToWebSocketSettings}
            />
            
            <Divider style={{ marginVertical: 8 }} />
            
            <List.Item
              title="API Usage"
              description={`Current month: ${Math.floor(Math.random() * 80) + 20}/5000 calls`}
              left={props => <List.Icon {...props} icon="api" />}
            />
          </Surface>

          <Surface style={[styles.section, { marginBottom: 30 }]} elevation={2}>
            <Text variant="titleLarge" style={styles.sectionTitle}>Contribution Schedule</Text>
            
            <View style={styles.contributionList}>
              {monthlyContributions.map((contribution, index) => (
                <View key={index} style={styles.contributionItem}>
                  <View>
                    <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>
                      {new Date(contribution.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                    </Text>
                    <Text variant="bodySmall">${contribution.amount}</Text>
                  </View>
                  
                  {contribution.status === "completed" ? (
                    <View style={[styles.badge, { backgroundColor: paperTheme.colors.primary }]}>
                      <Text variant="labelSmall" style={{ color: "white" }}>Completed</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.badge, { backgroundColor: paperTheme.colors.secondary }]}
                      onPress={() => markAsCompleted(index)}
                    >
                      <Text variant="labelSmall" style={{ color: "white" }}>Mark as Completed</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
            
            <Button
              mode="outlined"
              onPress={addContribution}
              style={{ marginTop: 15 }}
            >
              Add New Contribution
            </Button>
          </Surface>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  section: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
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
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
    minWidth: "30%",
  },
  planSettings: {
    marginTop: 16,
  },
  contributionList: {
    marginTop: 8,
  },
  contributionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
});