import React from 'react';
import { View } from 'react-native';
import { Text, ActivityIndicator, useTheme } from 'react-native-paper';
import { commonStyles } from '../styles/common';
import BaseScreen from './BaseScreen';

interface LoadingScreenProps {
  title?: string;
  message?: string;
  showAppBar?: boolean;
}

/**
 * Loading screen component that provides consistent loading UI
 */
const LoadingScreen: React.FC<LoadingScreenProps> = ({
  title = 'Loading',
  message = 'Please wait...',
  showAppBar = true,
}) => {
  const theme = useTheme();

  const loadingContent = (
    <View style={commonStyles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text variant="bodyMedium" style={{ marginTop: 16 }}>
        {message}
      </Text>
    </View>
  );

  if (showAppBar) {
    return (
      <BaseScreen title={title}>
        {loadingContent}
      </BaseScreen>
    );
  }

  return loadingContent;
};

export default LoadingScreen;