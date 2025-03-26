import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { commonStyles } from '../styles/common';

interface EmptyStateProps {
  message: string;
  icon?: string;
  buttonLabel?: string;
  onButtonPress?: () => void;
}

/**
 * Empty state component for displaying when no data is available
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  message,
  icon = 'information-outline',
  buttonLabel,
  onButtonPress,
}) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons 
        name={icon as any} 
        size={64} 
        color={theme.colors.onSurfaceVariant} 
      />
      
      <Text 
        variant="bodyLarge" 
        style={[commonStyles.emptyText, { marginVertical: 16 }]}
      >
        {message}
      </Text>
      
      {buttonLabel && onButtonPress && (
        <Button 
          mode="contained" 
          onPress={onButtonPress}
          style={commonStyles.button}
        >
          {buttonLabel}
        </Button>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});

export default EmptyState;