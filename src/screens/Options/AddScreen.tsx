import React, { useState, useCallback } from "react";
import { View, ScrollView, Alert, KeyboardAvoidingView, StyleSheet, Platform, FlatList, TouchableOpacity } from "react-native";
import {
  Text,
  TextInput,
  Button,
  useTheme,
  ActivityIndicator,
  Divider,
  Card,
  Surface,
  List,
  SegmentedButtons,
  HelperText,
  Switch
} from "react-native-paper";
import { supabase } from "../../initSupabase";
import { router } from "expo-router";
import { searchStocks, fetchOptionsData, OptionData } from "../../services/polygon";
import { debounce } from 'lodash';
import { OptionPosition } from "./PositionsScreen";
import { BaseScreen } from "../";
import { commonStyles, formStyles } from "../styles/common";

/**
 * Screen for adding a new option position to the portfolio
 */
export default function AddScreen() {
  const paperTheme = useTheme();
  
  // Form state
  const [underlying, setUnderlying] = useState("");
  const [contractType, setContractType] = useState<'call' | 'put'>('call');
  const [strikePrice, setStrikePrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [avgPrice, setAvgPrice] = useState("");
  const [expirationDate, setExpirationDate] = useState(new Date());
  const [symbol, setSymbol] = useState("");
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [availableOptions, setAvailableOptions] = useState<OptionData[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [selectedOption, setSelectedOption] = useState<OptionData | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  
  // Date input ref (for web)
  const dateInputRef = React.useRef<HTMLInputElement>(null);
  
  // Search for stocks with debounce
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setSearchResults([]);
        setSearching(false);
        return;
      }
      
      try {
        const results = await searchStocks(query);
        setSearchResults(results);
      } catch (error) {
        console.error("Error searching stocks:", error);
      } finally {
        setSearching(false);
      }
    }, 500),
    []
  );
  
  // Handle underlying symbol input change
  const handleUnderlyingChange = (text: string) => {
    const upperText = text.toUpperCase();
    setUnderlying(upperText);
    
    if (upperText.length >= 2) {
      setSearching(true);
      debouncedSearch(upperText);
    } else {
      setSearchResults([]);
    }
  };
  
  // Handle selecting a stock from search results
  const handleSelectStock = async (stock: any) => {
    setUnderlying(stock.ticker);
    setSearchResults([]);
    
    // Load options data
    await loadOptionsData(stock.ticker);
  };
  
  // Load options data
  const loadOptionsData = async (ticker: string) => {
    try {
      setLoadingOptions(true);
      
      // Get today's date and format for API
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];
      
      // Fetch options data
      const options = await fetchOptionsData(ticker, formattedDate);
      
      // Sort by strike price
      options.sort((a, b) => a.strikePrice - b.strikePrice);
      
      setAvailableOptions(options);
    } catch (error) {
      console.error("Error loading options data:", error);
    } finally {
      setLoadingOptions(false);
    }
  };
  
  // Handle date change 
  const handleDateChange = (e: any) => {
    // Handle HTML input date change for web
    if (e.target?.value) {
      const newDate = new Date(e.target.value);
      setExpirationDate(newDate);
      
      // If we have a symbol and it's not manual entry, load options for this date
      if (underlying && !manualEntry) {
        loadOptionsForDate(underlying, newDate);
      }
    }
  };
  
  // Load options for a specific date
  const loadOptionsForDate = async (ticker: string, date: Date) => {
    try {
      setLoadingOptions(true);
      
      // Format date for API
      const formattedDate = date.toISOString().split('T')[0];
      
      // Fetch options data
      const options = await fetchOptionsData(ticker, formattedDate);
      
      // Sort by strike price
      options.sort((a, b) => a.strikePrice - b.strikePrice);
      
      setAvailableOptions(options);
    } catch (error) {
      console.error("Error loading options for date:", error);
    } finally {
      setLoadingOptions(false);
    }
  };
  
  // Handle selecting an option
  const handleSelectOption = (option: OptionData) => {
    setSelectedOption(option);
    setStrikePrice(option.strikePrice.toString());
    setContractType(option.optionType);
    setSymbol(option.symbol);
    
    // If current price is available, use it as the average price
    if (option.lastPrice > 0) {
      setAvgPrice(option.lastPrice.toString());
    }
  };
  
  // Generate option symbol if needed (for manual entry)
  React.useEffect(() => {
    if (manualEntry && underlying && strikePrice && expirationDate) {
      const dateStr = expirationDate.toISOString().split('T')[0].replace(/-/g, '');
      const strike = parseFloat(strikePrice).toFixed(0).padStart(8, '0');
      const type = contractType === 'call' ? 'C' : 'P';
      
      const generatedSymbol = `${underlying}${dateStr}${type}${strike}`;
      setSymbol(generatedSymbol);
    }
  }, [manualEntry, underlying, strikePrice, contractType, expirationDate]);
  
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
    
    setLoading(true);
    
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
      
      // Add new position
      const { error } = await supabase
        .from('options_positions')
        .insert([optionPosition]);
      
      if (error) {
        throw new Error(error.message);
      }
      
      Alert.alert("Success", "Option position added to portfolio", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error("Error saving option position:", error);
      Alert.alert("Error", "Failed to save option position");
    } finally {
      setLoading(false);
    }
  };
  
  // Filter options based on contract type
  const filteredOptions = availableOptions.filter(
    option => option.optionType === contractType
  );
  
  // Format date for display
  const formattedDate = expirationDate.toISOString().split('T')[0];
  
  return (
    <BaseScreen
      title="Add Option Position"
      showBackButton={true}
      onBack={() => router.back()}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={commonStyles.container}
      >
        <ScrollView style={commonStyles.container}>
          <View style={formStyles.formContainer}>
            {/* Manual entry toggle */}
            <View style={styles.toggleContainer}>
              <Text variant="bodyMedium">Manual entry</Text>
              <Switch
                value={manualEntry}
                onValueChange={setManualEntry}
              />
            </View>
            
            <Text variant="bodyMedium" style={formStyles.label}>Underlying Symbol *</Text>
            <View style={styles.symbolRow}>
              <TextInput
                mode="outlined"
                placeholder="e.g., SPY"
                value={underlying}
                autoCapitalize="characters"
                onChangeText={handleUnderlyingChange}
                style={formStyles.input}
              />
            </View>
            
            {/* Search results */}
            {searching && (
              <View style={styles.searchingContainer}>
                <ActivityIndicator size="small" />
                <Text style={styles.searchingText}>Searching...</Text>
              </View>
            )}
            
            {searchResults.length > 0 && (
              <Surface style={styles.searchResultsContainer} elevation={3}>
                <FlatList
                  data={searchResults}
                  renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => handleSelectStock(item)}>
                      <List.Item
                        title={item.ticker}
                        description={item.name}
                        left={props => <List.Icon {...props} icon="chart-line" />}
                        right={props => <List.Icon {...props} icon="chevron-right" />}
                      />
                      <Divider />
                    </TouchableOpacity>
                  )}
                  keyExtractor={(item) => item.ticker}
                  style={styles.searchResults}
                  keyboardShouldPersistTaps="handled"
                  ListHeaderComponent={() => (
                    <View style={styles.searchResultsHeader}>
                      <Text variant="bodySmall">Select a stock:</Text>
                    </View>
                  )}
                />
              </Surface>
            )}
            
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
            
            <Text variant="bodyMedium" style={formStyles.label}>Expiration Date *</Text>
            
            {/* Web-compatible date input */}
            <View style={styles.datePickerContainer}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={handleDateButtonClick}
                activeOpacity={0.7}
              >
                <Text>{formattedDate}</Text>
              </TouchableOpacity>
              
              {/* Hidden HTML input for date picker */}
              <input
                ref={dateInputRef}
                type="date"
                value={formattedDate}
                onChange={handleDateChange}
                style={{
                  position: 'absolute',
                  opacity: 0,
                  width: 0,
                  height: 0
                }}
              />
            </View>
            
            <Text variant="bodyMedium" style={formStyles.label}>Strike Price *</Text>
            <TextInput
              mode="outlined"
              placeholder="e.g., 450"
              value={strikePrice}
              onChangeText={setStrikePrice}
              keyboardType="decimal-pad"
              style={formStyles.input}
              disabled={!manualEntry && !!selectedOption}
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

            {/* Available options from API if not manual entry */}
            {!manualEntry && underlying && filteredOptions.length > 0 && (
              <Card style={styles.optionsCard}>
                <Card.Title title="Available Options" />
                <Card.Content>
                  <View style={styles.optionsHelper}>
                    <Text variant="bodySmall">Select an option to autofill details:</Text>
                  </View>
                  
                  {loadingOptions ? (
                    <ActivityIndicator style={{ margin: 20 }} />
                  ) : (
                    <ScrollView style={styles.optionsList}>
                      {filteredOptions.map((option) => (
                        <TouchableOpacity
                          key={option.symbol}
                          onPress={() => handleSelectOption(option)}
                          style={[
                            styles.optionItem,
                            selectedOption?.symbol === option.symbol && styles.selectedOption
                          ]}
                        >
                          <Text variant="bodyMedium">${option.strikePrice.toFixed(2)}</Text>
                          <Text variant="bodySmall">
                            Premium: ${option.lastPrice.toFixed(2)} | Delta: {option.greeks.delta.toFixed(3)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </Card.Content>
              </Card>
            )}
            
            <Button
              mode="contained"
              onPress={handleSave}
              loading={loading}
              disabled={loading}
              style={commonStyles.button}
              icon="content-save"
            >
              {loading ? "Saving..." : "Add Position"}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  symbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
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
  },
  searchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  searchingText: {
    marginLeft: 8,
    opacity: 0.7,
  },
  searchResultsContainer: {
    marginTop: 8,
    borderRadius: 8,
    maxHeight: 250,
  },
  searchResults: {
    padding: 8,
  },
  searchResultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  optionsCard: {
    marginTop: 16,
    marginBottom: 16,
  },
  optionsHelper: {
    marginBottom: 8,
  },
  optionsList: {
    maxHeight: 200,
  },
  optionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  selectedOption: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  }
});