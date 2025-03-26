import React, { useState, useEffect } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { Text, Surface, TextInput, Button, useTheme } from "react-native-paper";
import { router } from "expo-router";
import { getCashBalance, updateCashBalance } from "../../services/portfolio";
import { BaseScreen, LoadingScreen } from "../";
import { commonStyles, formStyles } from "../styles/common";

/**
 * Screen for managing cash balance
 */
export default function CashScreen() {
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
    return <LoadingScreen message="Loading cash balance..." />;
  }
  
  return (
    <BaseScreen 
      title="Cash Management" 
      showBackButton={true}
      onBack={() => router.back()}
    >
      <View style={commonStyles.content}>
        <Surface style={styles.balanceCard} elevation={2}>
          <Text variant="titleMedium">Available Cash</Text>
          <Text variant="displaySmall">${cashBalance.toFixed(2)}</Text>
        </Surface>
        
        <Surface style={[commonStyles.surface, styles.section]} elevation={2}>
          <Text variant="titleMedium" style={formStyles.title}>Update Cash Balance</Text>
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
            style={formStyles.input}
          />
          
          <Button
            mode="contained"
            onPress={handleUpdateBalance}
            loading={updatingBalance}
            icon="content-save"
            style={commonStyles.button}
          >
            Update Balance
          </Button>
        </Surface>
      </View>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  balanceCard: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionDescription: {
    marginBottom: 16,
    opacity: 0.7,
  }
});