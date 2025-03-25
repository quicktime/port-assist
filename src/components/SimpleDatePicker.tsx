// src/components/SimpleDatePicker.tsx
import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import { Text, Button } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';

interface SimpleDatePickerProps {
  date: Date;
  onDateChange: (date: Date) => void;
  label?: string;
}

const SimpleDatePicker: React.FC<SimpleDatePickerProps> = ({
  date,
  onDateChange,
  label = 'Select Date'
}) => {
  const [showPicker, setShowPicker] = useState(false);

  // Format date as YYYY-MM-DD
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Handle date change from native picker
  const handleChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    
    if (selectedDate) {
      onDateChange(selectedDate);
    }
  };

  // Show the date picker
  const showDatePicker = () => {
    setShowPicker(true);
  };

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <TouchableOpacity onPress={showDatePicker} style={styles.dateButton}>
        <Text>{formatDate(date)}</Text>
      </TouchableOpacity>

      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={handleChange}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal
          visible={showPicker}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{label}</Text>
              
              <DateTimePicker
                value={date}
                mode="date"
                display="spinner"
                onChange={handleChange}
                style={styles.datePicker}
              />
              
              <View style={styles.buttonContainer}>
                <Button onPress={() => setShowPicker(false)}>
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={() => {
                    setShowPicker(false);
                    onDateChange(date);
                  }}
                >
                  Confirm
                </Button>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    marginBottom: 8,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 10,
    height: 50,
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  datePicker: {
    height: 200,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
});

export default SimpleDatePicker;