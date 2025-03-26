import React, { useState, useEffect } from "react";
import { View, ScrollView, Alert, KeyboardAvoidingView, StyleSheet, Platform, TouchableOpacity } from "react-native";
import {
  Text,
  TextInput,
  Button,
  useTheme,
  Divider,
  SegmentedButtons,
  HelperText,
} from "react-native-paper";
import { supabase } from "../../initSupabase";
import { router, useLocalSearchParams } from "expo-router";
import { OptionPosition } from "../Portfolio/OptionsPortfolioScreen";
import { BaseScreen, LoadingScreen } from "../";
import { commonStyles, formStyles } from "../styles/common";

/**
 * Screen for editing an existing option position in the portfolio
 */
export default function EditScreen() {
  const params = useLocalSearchParams();
  const paperTheme = useTheme();
  
  // Form state
  const [loading, setLoading] = useState(true);
  const [editPosition, setEditPosition] = useState<OptionPosition | undefined>(undefined);
  const [underlying, setUnderlying] = useState("");
  const [contractType, setContractType] = useState<'call' | 'put'>('call');
  const [strikePrice, setStrikePrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [avgPrice, setAvgPrice] = useState("");
  const [expirationDate, setExpirationDate] = useState(new Date());
  const [symbol, setSymbol] = useState("");
  
  // UI state
  const [saving, setSaving] = useState(false);
  
  // Date input ref (for web)
  const dateInputRef = React.useRef<HTMLInputElement>(null);
  
  // Load position data
  useEffect(() => {
    if (params.position) {
      try {
        const position = JSON.parse(params.position as string) as OptionPosition;
        setEditPosition(position);
        setUnderlying(position.underlying || "");
        setContractType(position.contract_type || 'call');
        setStrikePrice(position.strike_price?.toString() || "");
        setQuantity(position.quantity?.toString() || "1");
        setAvgPrice(position.avg_price?.toString() || "");
        setExpirationDate(
          position.expiration_date ? new Date(position.expiration_date) : new Date()
        );
        setSymbol(position.symbol || "");
        setLoading(false);
      } catch (error) {
        console.error("Error parsing option position:", error);
        Alert.alert("Error", "Failed to load option position");
        router.back();
      }
    } else {
      Alert.alert("Error", "No position selected to edit");
      router.back();
    }
  }, [params.position]);
  
  // Handle date change 
  const handleDateChange = (e: any) => {
    // Handle HTML input date change for web
    if (e.target?.value) {
      const newDate = new Date(e.target.value);
      setExpirationDate(newDate);
    }
  };
  
  // Click handler for date button (focuses the input for web)
  const handleDateButtonClick = () => {
    if (dateInputRef.current) {
      dateInputRef.current.click();
    }
  };
  
  // Handle save
  const handleSave = async () => {
    // Validate inputs
    if (!underlying) {
      Alert.alert("Error", "Please enter an underlying symbol");
      return;
    }
    
    if (!strikePrice || isNaN(parseFloat(strikePrice))) {
      Alert.alert("Error", "Please enter a valid strike price");
      return;
    }
    
    if (!quantity || isNaN(parseInt(quantity))) {
      Alert.alert("Error", "Please enter a valid quantity");
      return;
    }
    
    if (!avgPrice || isNaN(parseFloat(avgPrice))) {
      Alert.alert("Error", "Please enter a valid average price");
      return;
    }
    
    if (!symbol) {
      Alert.alert("Error", "Option symbol is missing");
      return;
    }
    
    setSaving(true);
    
    try {
      const optionPosition: OptionPosition = {
        underlying,
        symbol,
        contract_type: contractType,
        strike_price: parseFloat(strikePrice),
        expiration_date: expirationDate.toISOString().split('T')[0],
        quantity: parseInt(quantity),
        avg_price: parseFloat(avgPrice)
      };
      
      if (editPosition?.id) {
        // Update existing position
        const { error } = await supabase
          .from('options_positions')
          .update(optionPosition)
          .eq('id', editPosition.id);
        
        if (error) {
          throw new Error(error.message);
        }
        
        Alert.alert("Success", "Option position updated successfully", [
          { text: "OK", onPress: () => router.back() }
        ]);
      } else {
        throw new Error("Missing position ID");
      }
    } catch (error) {
      console.error("Error updating option position:", error);
      Alert.alert("Error", "Failed to update option position");
    } finally {
      setSaving(false);
    }
  };
  
  // Format date for display
  const formattedDate = expirationDate.toISOString().split('T')[0];
  
  if (loading) {
    return <LoadingScreen message="Loading option position..." />;
  }
  
  return (
    <BaseScreen
      title="Edit Option Position"
      showBackButton={true}
      onBack={() => router.back()}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={commonStyles.container}
      >
        <ScrollView style={commonStyles.container}>
          <View style={formStyles.formContainer}>
            <Text variant="bodyMedium" style={formStyles.label}>Underlying Symbol</Text>
            <TextInput
              mode="outlined"
              value={underlying}
              disabled={true}
              style={formStyles.input}
            />
            
            <Divider style={commonStyles.divider} />
            
            <Text variant="bodyMedium" style={formStyles.label}>Contract Type *</Text>
            <SegmentedButtons
              value={contractType}
              onValueChange={(value) => setContractType(value as 'call' | 'put')}
              buttons={[
                { value: 'call', label: 'Call' },
                { value: 'put', label: 'Put' }
              ]}
              style={styles.segmentedButton}
            />
            
            <Text variant="bodyMedium" style={formStyles.label}>Expiration Date</Text>
            
            {/* Web-compatible date input */}
            <View style={styles.datePickerContainer}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={handleDateButtonClick}
                activeOpacity={0.7}
                disabled={true}
              >
                <Text>{formattedDate}</Text>
              </TouchableOpacity>
              
              {/* Hidden HTML input for date picker */}
              <input
                ref={dateInputRef}
                type="date"
                value={formattedDate}
                onChange={handleDateChange}
                disabled={true}
                style={{
                  position: 'absolute',
                  opacity: 0,
                  width: 0,
                  height: 0
                }}
              />
            </View>
            
            <Text variant="bodyMedium" style={formStyles.label}>Strike Price</Text>
            <TextInput
              mode="outlined"
              value={strikePrice}
              disabled={true}
              style={formStyles.input}
              left={<TextInput.Affix text="$" />}
            />
            
            <Text variant="bodyMedium" style={formStyles.label}>Quantity *</Text>
            <TextInput
              mode="outlined"
              placeholder="Number of contracts"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
              style={formStyles.input}
            />
            
            <Text variant="bodyMedium" style={formStyles.label}>Average Price Per Contract *</Text>
            <TextInput
              mode="outlined"
              placeholder="Average price paid per contract"
              value={avgPrice}
              onChangeText={setAvgPrice}
              keyboardType="decimal-pad"
              style={formStyles.input}
              left={<TextInput.Affix text="$" />}
            />
            
            <HelperText type="info">
              Total cost: ${(parseFloat(avgPrice || "0") * parseInt(quantity || "0") * 100).toFixed(2)}
            </HelperText>
            
            <Button
              mode="contained"
              onPress={handleSave}
              loading={saving}
              disabled={saving}
              style={commonStyles.button}
              icon="content-save"
            >
              {saving ? "Saving..." : "Update Position"}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  segmentedButton: {
    marginBottom: 16,
  },
  datePickerContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  dateButton: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5'
  }
});