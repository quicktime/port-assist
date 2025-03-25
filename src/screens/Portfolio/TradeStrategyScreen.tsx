// src/screens/Portfolio/TradeStrategyScreen.tsx
import React, { useState, useEffect } from "react";
import { View, ScrollView, StyleSheet, Alert } from "react-native";
import {
  Appbar,
  Text,
  Surface,
  Button,
  SegmentedButtons,
  TextInput,
  Chip,
  Divider,
  List,
  TouchableRipple,
  useTheme,
  RadioButton,
  HelperText,
  ActivityIndicator
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../../provider/ThemeProvider";
import { router } from "expo-router";
import { 
  getTradeStrategy,
  updateTradeStrategy,
  createDefaultTradeStrategy 
} from "../../services/strategy";
import { TradeStrategyPreferences } from "../../services/claude/types";

export default function TradeStrategyScreen() {
  const { isDarkMode, toggleTheme } = useAppTheme();
  const paperTheme = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Strategy state
  const [strategy, setStrategy] = useState<TradeStrategyPreferences>({
    riskTolerance: 'moderate',
    optionPreference: 'both',
    expirationPreference: 'monthly',
    strikePreference: 'ATM',
    maxTradePercentage: 5,
    stopLossPercentage: 10,
    takeProfitPercentage: 20,
    preferredStrategies: ['covered calls', 'cash secured puts'],
    technicalIndicators: ['RSI', 'MACD', 'Moving Averages'],
    fundamentalFactors: ['Earnings', 'Growth', 'Valuation']
  });
  
  // State for dynamic array fields
  const [newStrategy, setNewStrategy] = useState("");
  const [newIndicator, setNewIndicator] = useState("");
  const [newFactor, setNewFactor] = useState("");
  
  useEffect(() => {
    loadStrategy();
  }, []);
  
  const loadStrategy = async () => {
    try {
      setLoading(true);
      const userStrategy = await getTradeStrategy();
      setStrategy(userStrategy);
    } catch (error) {
      console.error("Error loading trade strategy:", error);
      Alert.alert("Error", "Failed to load trading strategy preferences");
    } finally {
      setLoading(false);
    }
  };
  
  const handleSave = async () => {
    try {
      setSaving(true);
      await updateTradeStrategy(strategy);
      Alert.alert("Success", "Trading strategy preferences saved successfully");
    } catch (error) {
      console.error("Error saving trade strategy:", error);
      Alert.alert("Error", "Failed to save trading strategy preferences");
    } finally {
      setSaving(false);
    }
  };
  
  const handleReset = () => {
    Alert.alert(
      "Reset to Default",
      "Are you sure you want to reset all strategy settings to default values?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const defaultStrategy = await createDefaultTradeStrategy();
              setStrategy(defaultStrategy);
              Alert.alert("Success", "Trading strategy preferences reset to defaults");
            } catch (error) {
              console.error("Error resetting trade strategy:", error);
              Alert.alert("Error", "Failed to reset trading strategy preferences");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };
  
  // Handlers for array fields
  const addStrategyItem = () => {
    if (!newStrategy.trim()) return;
    setStrategy({
      ...strategy,
      preferredStrategies: [...strategy.preferredStrategies, newStrategy.trim()]
    });
    setNewStrategy("");
  };
  
  const removeStrategyItem = (index: number) => {
    setStrategy({
      ...strategy,
      preferredStrategies: strategy.preferredStrategies.filter((_, i) => i !== index)
    });
  };
  
  const addIndicator = () => {
    if (!newIndicator.trim()) return;
    setStrategy({
      ...strategy,
      technicalIndicators: [...strategy.technicalIndicators, newIndicator.trim()]
    });
    setNewIndicator("");
  };
  
  const removeIndicator = (index: number) => {
    setStrategy({
      ...strategy,
      technicalIndicators: strategy.technicalIndicators.filter((_, i) => i !== index)
    });
  };
  
  const addFactor = () => {
    if (!newFactor.trim()) return;
    setStrategy({
      ...strategy,
      fundamentalFactors: [...strategy.fundamentalFactors, newFactor.trim()]
    });
    setNewFactor("");
  };
  
  const removeFactor = (index: number) => {
    setStrategy({
      ...strategy,
      fundamentalFactors: strategy.fundamentalFactors.filter((_, i) => i !== index)
    });
  };
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Trading Strategy" />
          <Appbar.Action 
            icon={isDarkMode ? "white-balance-sunny" : "moon-waning-crescent"} 
            onPress={toggleTheme} 
          />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={paperTheme.colors.primary} />
          <Text style={styles.loadingText}>Loading strategy preferences...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Trading Strategy" />
        <Appbar.Action 
          icon={isDarkMode ? "white-balance-sunny" : "moon-waning-crescent"} 
          onPress={toggleTheme} 
        />
      </Appbar.Header>
      
      <ScrollView style={styles.scrollView}>
        <Surface style={styles.infoCard}>
          <Text variant="titleMedium">Trading Strategy Preferences</Text>
          <Text variant="bodyMedium" style={styles.infoText}>
            These settings will be used to generate personalized trade recommendations
            based on your portfolio and market data.
          </Text>
        </Surface>
        
        <Surface style={styles.section}>
          <List.Section>
            <List.Subheader>Risk Profile</List.Subheader>
            
            <View style={styles.optionContainer}>
              <Text variant="bodyMedium">Risk Tolerance</Text>
              <SegmentedButtons
                value={strategy.riskTolerance}
                onValueChange={(value) => 
                  setStrategy({ ...strategy, riskTolerance: value as 'conservative' | 'moderate' | 'aggressive' })
                }
                buttons={[
                  { value: 'conservative', label: 'Conservative' },
                  { value: 'moderate', label: 'Moderate' },
                  { value: 'aggressive', label: 'Aggressive' }
                ]}
              />
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.optionContainer}>
              <Text variant="bodyMedium">Maximum Trade Size (% of Cash)</Text>
              <TextInput
                mode="outlined"
                keyboardType="numeric"
                value={strategy.maxTradePercentage.toString()}
                onChangeText={(text) => {
                  const value = parseFloat(text);
                  if (!isNaN(value) && value >= 0 && value <= 100) {
                    setStrategy({ ...strategy, maxTradePercentage: value });
                  }
                }}
                right={<TextInput.Affix text="%" />}
                style={styles.percentInput}
              />
              <HelperText type="info" visible={true}>
                Maximum percentage of available cash to use for a single trade
              </HelperText>
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.optionContainer}>
              <Text variant="bodyMedium">Stop Loss (% of Entry Price)</Text>
              <TextInput
                mode="outlined"
                keyboardType="numeric"
                value={strategy.stopLossPercentage.toString()}
                onChangeText={(text) => {
                  const value = parseFloat(text);
                  if (!isNaN(value) && value >= 0 && value <= 100) {
                    setStrategy({ ...strategy, stopLossPercentage: value });
                  }
                }}
                right={<TextInput.Affix text="%" />}
                style={styles.percentInput}
              />
              <HelperText type="info" visible={true}>
                Default stop loss percentage below entry price
              </HelperText>
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.optionContainer}>
              <Text variant="bodyMedium">Take Profit (% of Entry Price)</Text>
              <TextInput
                mode="outlined"
                keyboardType="numeric"
                value={strategy.takeProfitPercentage.toString()}
                onChangeText={(text) => {
                  const value = parseFloat(text);
                  if (!isNaN(value) && value >= 0) {
                    setStrategy({ ...strategy, takeProfitPercentage: value });
                  }
                }}
                right={<TextInput.Affix text="%" />}
                style={styles.percentInput}
              />
              <HelperText type="info" visible={true}>
                Default take profit percentage above entry price
              </HelperText>
            </View>
          </List.Section>
        </Surface>
        
        <Surface style={styles.section}>
          <List.Section>
            <List.Subheader>Options Preferences</List.Subheader>
            
            <View style={styles.optionContainer}>
              <Text variant="bodyMedium">Option Types</Text>
              <SegmentedButtons
                value={strategy.optionPreference}
                onValueChange={(value) => 
                  setStrategy({ ...strategy, optionPreference: value as 'calls' | 'puts' | 'both' })
                }
                buttons={[
                  { value: 'calls', label: 'Calls Only' },
                  { value: 'puts', label: 'Puts Only' },
                  { value: 'both', label: 'Both' }
                ]}
              />
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.optionContainer}>
              <Text variant="bodyMedium">Expiration Preference</Text>
              <RadioButton.Group
                value={strategy.expirationPreference}
                onValueChange={(value) => 
                  setStrategy({ ...strategy, expirationPreference: value as any })
                }
              >
                <RadioButton.Item label="Weekly" value="weekly" />
                <RadioButton.Item label="Monthly" value="monthly" />
                <RadioButton.Item label="Quarterly" value="quarterly" />
                <RadioButton.Item label="LEAPS (Long-term)" value="leaps" />
              </RadioButton.Group>
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.optionContainer}>
              <Text variant="bodyMedium">Strike Price Preference</Text>
              <RadioButton.Group
                value={strategy.strikePreference}
                onValueChange={(value) => 
                  setStrategy({ ...strategy, strikePreference: value as any })
                }
              >
                <RadioButton.Item label="In-the-Money (ITM)" value="ITM" />
                <RadioButton.Item label="At-the-Money (ATM)" value="ATM" />
                <RadioButton.Item label="Out-of-the-Money (OTM)" value="OTM" />
              </RadioButton.Group>
            </View>
          </List.Section>
        </Surface>
        
        <Surface style={styles.section}>
          <List.Section>
            <List.Subheader>Preferred Strategies</List.Subheader>
            
            <View style={styles.chipsContainer}>
              {strategy.preferredStrategies.map((item, index) => (
                <Chip
                  key={index}
                  mode="outlined"
                  onClose={() => removeStrategyItem(index)}
                  style={styles.chip}
                >
                  {item}
                </Chip>
              ))}
            </View>
            
            <View style={styles.addItemContainer}>
              <TextInput
                mode="outlined"
                label="Add strategy"
                value={newStrategy}
                onChangeText={setNewStrategy}
                style={styles.addItemInput}
              />
              <Button
                mode="contained"
                onPress={addStrategyItem}
                disabled={!newStrategy.trim()}
                style={styles.addButton}
              >
                Add
              </Button>
            </View>
          </List.Section>
        </Surface>
        
        <Surface style={styles.section}>
          <List.Section>
            <List.Subheader>Technical Indicators</List.Subheader>
            
            <View style={styles.chipsContainer}>
              {strategy.technicalIndicators.map((item, index) => (
                <Chip
                  key={index}
                  mode="outlined"
                  onClose={() => removeIndicator(index)}
                  style={styles.chip}
                >
                  {item}
                </Chip>
              ))}
            </View>
            
            <View style={styles.addItemContainer}>
              <TextInput
                mode="outlined"
                label="Add indicator"
                value={newIndicator}
                onChangeText={setNewIndicator}
                style={styles.addItemInput}
              />
              <Button
                mode="contained"
                onPress={addIndicator}
                disabled={!newIndicator.trim()}
                style={styles.addButton}
              >
                Add
              </Button>
            </View>
          </List.Section>
        </Surface>
        
        <Surface style={styles.section}>
          <List.Section>
            <List.Subheader>Fundamental Factors</List.Subheader>
            
            <View style={styles.chipsContainer}>
              {strategy.fundamentalFactors.map((item, index) => (
                <Chip
                  key={index}
                  mode="outlined"
                  onClose={() => removeFactor(index)}
                  style={styles.chip}
                >
                  {item}
                </Chip>
              ))}
            </View>
            
            <View style={styles.addItemContainer}>
              <TextInput
                mode="outlined"
                label="Add factor"
                value={newFactor}
                onChangeText={setNewFactor}
                style={styles.addItemInput}
              />
              <Button
                mode="contained"
                onPress={addFactor}
                disabled={!newFactor.trim()}
                style={styles.addButton}
              >
                Add
              </Button>
            </View>
          </List.Section>
        </Surface>
        
        <View style={styles.buttonsContainer}>
          <Button
            mode="contained"
            onPress={handleSave}
            loading={saving}
            icon="content-save"
            style={styles.saveButton}
          >
            Save Strategy
          </Button>
          
          <Button
            mode="outlined"
            onPress={handleReset}
            icon="refresh"
            style={styles.resetButton}
          >
            Reset to Default
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
  },
  infoCard: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  infoText: {
    marginTop: 8,
  },
  section: {
    margin: 16,
    marginTop: 0,
    marginBottom: 16,
    borderRadius: 8,
  },
  optionContainer: {
    padding: 16,
  },
  divider: {
    marginHorizontal: 16,
  },
  percentInput: {
    marginTop: 8,
    maxWidth: 150,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
  },
  chip: {
    margin: 4,
  },
  addItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  addItemInput: {
    flex: 1,
    marginRight: 8,
  },
  addButton: {
    minWidth: 80,
    justifyContent: 'center',
  },
  buttonsContainer: {
    padding: 16,
    marginBottom: 20,
  },
  saveButton: {
    marginBottom: 12,
  },
  resetButton: {
    marginBottom: 12,
  }
});