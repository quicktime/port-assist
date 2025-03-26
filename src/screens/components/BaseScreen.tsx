import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar } from 'react-native-paper';
import { commonStyles } from '../styles/common';
import { useAppTheme } from '../../provider/ThemeProvider';

interface BaseScreenProps {
  title?: string;
  showBackButton?: boolean;
  showThemeToggle?: boolean;
  onBack?: () => void;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  edges?: Array<'top' | 'right' | 'bottom' | 'left'>;
}

/**
 * Base screen component that provides consistent layout with appbar
 */
const BaseScreen: React.FC<BaseScreenProps> = ({
  title,
  showBackButton = false,
  showThemeToggle = true,
  onBack,
  headerRight,
  children,
  edges = ['top'],
}) => {
  const { isDarkMode, toggleTheme } = useAppTheme();

  return (
    <SafeAreaView style={commonStyles.safeArea} edges={edges}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      
      <Appbar.Header>
        {showBackButton && (
          <Appbar.BackAction onPress={onBack} />
        )}
        
        {title && <Appbar.Content title={title} />}
        
        {headerRight}
        
        {showThemeToggle && (
          <Appbar.Action
            icon={isDarkMode ? 'white-balance-sunny' : 'moon-waning-crescent'}
            onPress={toggleTheme}
          />
        )}
      </Appbar.Header>
      
      {children}
    </SafeAreaView>
  );
};

export default BaseScreen;