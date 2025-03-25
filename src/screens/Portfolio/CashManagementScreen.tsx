// src/screens/Portfolio/CashManagementScreen.tsx
import React, { useState, useEffect } from "react";
import { View, StyleSheet, Alert } from "react-native";
import {
  Appbar,
  Text,
  Surface,
  TextInput,
  Button,
  useTheme,
  ActivityIndicator,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAppTheme } from "../../provider/ThemeProvider";
import { getCashBalance, updateCashBalance } from "../services/portfolioService";

export default function CashManagementScreen() {
  const { isDarkMode, toggleTheme } = useAppTheme();
  const paperTheme = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [cashBalance, setCashBalance] = useState(0);
  const [newBalance, setNewBalance] = useState("");
  const [updatingBalance, setUpdatingBalance] = useState(false);
  
  useEffect(() => {
    loadCashBalance();
  }, []);
  
  const loadCashBalance = async () => {
    try {
      setLoading(true);
      const balance = await getCashBalance();
      setCashBalance(balance);
      setNewBalance(balance.toString());
    } catch (error) {
      console.error("Error loading cash balance:", error);
      Alert.alert("Error", "Failed to load cash balance");
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateBalance = async () => {
    if (!newBalance || isNaN(Number(newBalance)) || Number(newBalance) < 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }
    
    try {
      setUpdatingBalance(true);
      await updateCashBalance(Number(newBalance));
      Alert.alert("Success", "Cash balance updated");
      setCashBalance(Number(newBalance));
    } catch (error) {
      console.error("Error updating cash balance:", error);
      Alert.alert("Error", "Failed to update cash balance");
    } finally {
      setUpdatingBalance(false);
    }
  };
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Cash Management" />
          <Appbar.Action 
            icon={isDarkMode ? "white-balance-sunny" : "moon-waning-crescent"} 
            onPress={toggleTheme} 
          />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={paperTheme.colors.primary} />
          <Text style={{ marginTop: 16 }}>Loading cash balance...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Cash Management" />
        <Appbar.Action 
          icon={isDarkMode ? "white-balance-sunny" : "moon-waning-crescent"} 
          onPress={toggleTheme} 
        />
      </Appbar.Header>
      
      <View style={styles.content}>
        <Surface style={styles.balanceCard} elevation={2}>
          <Text variant="titleMedium">Available Cash</Text>
          <Text variant="displaySmall">${cashBalance.toFixed(2)}</Text>
        </Surface>
        
        <Surface style={styles.section} elevation={2}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Update Cash Balance</Text>
          <Text variant="bodyMedium" style={styles.sectionDescription}>
            Enter your current available cash amount for investment.
          </Text>
          
          <TextInput
            label="Cash Balance"
            mode="outlined"
            value={newBalance}
            onChangeText={setNewBalance}
            keyboardType="decimal-pad"
            left={<TextInput.Affix text="$" />}
            style={styles.input}
          />
          
          <Button
            mode="contained"
            onPress={handleUpdateBalance}
            loading={updatingBalance}
            icon="content-save"
            style={styles.button}
          >
            Update Balance
          </Button>
        </Surface>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  balanceCard: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  section: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  sectionDescription: {
    marginBottom: 16,
    opacity: 0.7,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  }
});