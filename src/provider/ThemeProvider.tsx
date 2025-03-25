import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define font configuration
const fontConfig = {
  fontFamily: 'System',
  // Make sure to include all expected weights
  fontWeights: {
    regular: '400',
    medium: '500',
    bold: '700',
  },
};

// Customize the light theme with your app's colors
const CustomLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2196F3',
    secondary: '#03DAC6',
    tertiary: '#FF9800',
    error: '#B00020',
    background: '#F5F5F5',
    card: '#FFFFFF',
    text: '#000000',
    success: '#4CAF50'
  },
  // Make sure we define all font variants
  fonts: {
    ...MD3LightTheme.fonts,
  },
};

// Customize the dark theme with your app's colors
const CustomDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#90CAF9',
    secondary: '#03DAC6',
    tertiary: '#FFCC80',
    error: '#CF6679',
    background: '#121212',
    card: '#1E1E1E',
    text: '#FFFFFF',
    success: '#4CAF50'
  },
  // Make sure we define all font variants
  fonts: {
    ...MD3DarkTheme.fonts,
  },
};

// Theme context
type ThemeContextProps = {
  isDarkMode: boolean;
  toggleTheme: () => void;
  theme: typeof CustomLightTheme;
};

const ThemeContext = createContext<ThemeContextProps>({
  isDarkMode: false,
  toggleTheme: () => {},
  theme: CustomLightTheme,
});

// Hook for using the theme
export const useAppTheme = () => useContext(ThemeContext);

// Theme provider component
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const colorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(colorScheme === 'dark');
  
  // Set the theme based on device settings on mount
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const themePreference = await AsyncStorage.getItem('themePreference');
        if (themePreference !== null) {
          setIsDarkMode(themePreference === 'dark');
        } else {
          setIsDarkMode(colorScheme === 'dark');
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      }
    };

    loadThemePreference();
  }, [colorScheme]);

  // Toggle between light and dark themes
  const toggleTheme = async () => {
    try {
      const newThemeValue = !isDarkMode;
      setIsDarkMode(newThemeValue);
      await AsyncStorage.setItem('themePreference', newThemeValue ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const theme = isDarkMode ? CustomDarkTheme : CustomLightTheme;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme }}>
      <PaperProvider theme={theme}>
        {children}
      </PaperProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;