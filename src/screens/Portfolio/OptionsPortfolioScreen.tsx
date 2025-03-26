import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, DataTable, ActivityIndicator } from 'react-native-paper';
import { supabase } from '../../initSupabase';
import { router } from 'expo-router';

export interface OptionPosition {
  id?: number;
  underlying: string;
  symbol: string;
  contract_type: 'call' | 'put';
  strike_price: number;
  expiration_date: string;
  quantity: number;
  avg_price: number;
  last_price?: number;
  current_value?: number;
  profit_loss?: number;
  profit_loss_percent?: number;
}

export default function OptionsPortfolioScreen() {
  const [optionPositions, setOptionPositions] = useState<OptionPosition[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch option positions
  useEffect(() => {
    fetchOptionPositions();
  }, []);

  const fetchOptionPositions = async () => {
    try {
      const { data, error } = await supabase
        .from('options_positions')
        .select('*');

      if (error) {
        throw error;
      }

      if (data) {
        setOptionPositions(data);
      }
    } catch (error) {
      console.error('Error fetching option positions:', error);
      Alert.alert('Error', 'Failed to load option positions');
    } finally {
      setLoading(false);
    }
  };

  // Delete an option position
  const handleDelete = async (position: OptionPosition) => {
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to delete ${position.underlying} ${position.contract_type.toUpperCase()} ${position.strike_price}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase
                .from('options_positions')
                .delete()
                .eq('id', position.id);

              if (error) {
                throw error;
              }

              // Refresh the list
              fetchOptionPositions();
              Alert.alert('Success', 'Position deleted successfully');
            } catch (error) {
              console.error('Error deleting position:', error);
              Alert.alert('Error', 'Failed to delete position');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Calculate total value of all positions
  const calculateTotalValue = () => {
    return optionPositions.reduce((total, position) => {
      const positionValue = position.quantity * position.avg_price * 100;
      return total + positionValue;
    }, 0);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text>Loading option positions...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall">Options Portfolio</Text>
        <Button 
          mode="contained" 
          onPress={() => router.push('/options/add')}
          icon="plus"
        >
          Add Position
        </Button>
      </View>

      {optionPositions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text>No option positions yet.</Text>
          <Text style={styles.emptyStateSubtitle}>Add your first option position!</Text>
          <Button 
            mode="contained" 
            onPress={() => router.push('/options/add')}
            style={styles.emptyStateButton}
            icon="plus"
          >
            Add Position
          </Button>
        </View>
      ) : (
        <>
          <View style={styles.summaryContainer}>
            <Text variant="titleMedium">Total Value</Text>
            <Text variant="headlineMedium">${calculateTotalValue().toFixed(2)}</Text>
          </View>

          <DataTable>
            <DataTable.Header>
              <DataTable.Title>Symbol</DataTable.Title>
              <DataTable.Title numeric>Strike</DataTable.Title>
              <DataTable.Title>Type</DataTable.Title>
              <DataTable.Title numeric>Qty</DataTable.Title>
              <DataTable.Title numeric>Price</DataTable.Title>
              <DataTable.Title numeric>Value</DataTable.Title>
              <DataTable.Title>Actions</DataTable.Title>
            </DataTable.Header>

            {optionPositions.map((position) => {
              const totalValue = position.quantity * position.avg_price * 100;

              return (
                <DataTable.Row 
                  key={position.id}
                  onPress={() => {
                    router.push({
                      pathname: '/options/detail',
                      params: { position: JSON.stringify(position) }
                    });
                  }}
                >
                  <DataTable.Cell>{position.underlying}</DataTable.Cell>
                  <DataTable.Cell numeric>{position.strike_price}</DataTable.Cell>
                  <DataTable.Cell>{position.contract_type === 'call' ? 'CALL' : 'PUT'}</DataTable.Cell>
                  <DataTable.Cell numeric>{position.quantity}</DataTable.Cell>
                  <DataTable.Cell numeric>${position.avg_price.toFixed(2)}</DataTable.Cell>
                  <DataTable.Cell numeric>${totalValue.toFixed(2)}</DataTable.Cell>
                  <DataTable.Cell>
                    <View style={styles.actionsContainer}>
                      <Button 
                        icon="pencil" 
                        mode="text" 
                        compact 
                        onPress={() => {
                          router.push({
                            pathname: '/options/edit',
                            params: { position: JSON.stringify(position) }
                          });
                        }}
                      >
                        {''}
                      </Button>
                      <Button 
                        icon="delete" 
                        mode="text" 
                        compact 
                        onPress={() => handleDelete(position)}
                      >
                        {''}
                      </Button>
                    </View>
                  </DataTable.Cell>
                </DataTable.Row>
              );
            })}
          </DataTable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryContainer: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateSubtitle: {
    marginTop: 8,
    marginBottom: 20,
    opacity: 0.7,
  },
  emptyStateButton: {
    marginTop: 10,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});