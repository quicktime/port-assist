import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Text, Button, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../initSupabase';
import BaseScreen from '../components/BaseScreen';
import CustomText from '@/components/ui/CustomText';
import { commonStyles } from '../styles/common';

/**
 * Home screen showing main actions and entry points
 */
const HomeScreen = () => {
  return (
    <BaseScreen title="Investment Portfolio Tracker">
      <View style={commonStyles.centerContainer}>
        <Surface style={commonStyles.surface}>
          <CustomText 
            variant="titleLarge" 
            style={{ textAlign: 'center', marginBottom: 10 }}
          >
            Investment Portfolio Tracker
          </CustomText>
          
          <Text 
            variant="bodyMedium" 
            style={{ textAlign: 'center', marginBottom: 20 }}
          >
            Track your investments, monitor options data with greeks, and analyze your portfolio performance.
          </Text>
          
          <Button
            mode="contained"
            onPress={() => router.push('/portfolio')}
            style={{ marginTop: 10 }}
            icon={({ size, color }) => (
              <MaterialCommunityIcons name="chart-line" size={size} color={color} />
            )}
          >
            View Portfolio
          </Button>
          
          <Button
            mode="contained-tonal"
            onPress={() => router.push(`/options-chain/SPY`)}
            style={{ marginTop: 10 }}
            icon={({ size, color }) => (
              <MaterialCommunityIcons name="chart-timeline-variant" size={size} color={color} />
            )}
          >
            View Options Chain
          </Button>
          
          <Button
            mode="contained-tonal"
            onPress={() => router.push('/portfolio/add')}
            style={{ marginTop: 10 }}
            icon={({ size, color }) => (
              <MaterialCommunityIcons name="plus-circle-outline" size={size} color={color} />
            )}
          >
            Add New Stock
          </Button>
          
          <Button
            mode="outlined"
            onPress={async () => {
              const { error } = await supabase.auth.signOut();
              if (!error) {
                alert('Signed out!');
              }
              if (error) {
                alert(error.message);
              }
            }}
            style={{ marginTop: 30 }}
            icon={({ size, color }) => (
              <MaterialCommunityIcons name="logout" size={size} color={color} />
            )}
          >
            Logout
          </Button>
        </Surface>
      </View>
    </BaseScreen>
  );
};

export default HomeScreen;