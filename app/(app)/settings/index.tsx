// app/(app)/settings/index.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppTheme } from '../../../src/provider/ThemeProvider';

export default function SettingsIndex() {
  const { theme } = useAppTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <TouchableOpacity 
        style={[styles.setting, { borderBottomColor: theme.colors.border }]}
        onPress={() => router.push('/settings/websocket')}
      >
        <MaterialCommunityIcons name="access-point-network" size={24} color={theme.colors.primary} />
        <Text style={[styles.settingText, { color: theme.colors.text }]}>WebSocket Settings</Text>
        <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  setting: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
});
