import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { 
  MD3DarkTheme, 
  MD3LightTheme, 
  PaperProvider, 
  adaptNavigationTheme 
} from 'react-native-paper';
import { 
  NavigationContainer, 
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme 
} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Combine Paper and Navigation themes
const { LightTheme, DarkTheme } = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme,
  reactNavigationDark: NavigationDarkTheme,
});

// Customize the themes with your app's colors
const CombinedDefaultTheme = {
  ...MD3LightTheme,
  ...LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...LightTheme.colors,
    primary: '#2196F3',
    secondary: '#03DAC6',
    tertiary: '#FF9800',
    error: '#B00020',
    background: '#F5F5F5',
    card: '#FFFFFF',
    text: '#000000',
  },
};

const CombinedDarkTheme = {
  ...MD3DarkTheme,
  ...DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...DarkTheme.colors,
    primary: '#90CAF9',
    secondary: '#03DAC6',
    tertiary: '#FFCC80',
    error: '#CF6679',
    background: '#121212',
    card: '#1E1E1E',
    text: '#FFFFFF',
  },
};

// Theme context
type ThemeContextProps = {
  isDarkMode: boolean;
  toggleTheme: () => void;
  theme: typeof CombinedDefaultTheme;
};

const ThemeContext = createContext<ThemeContextProps>({
  isDarkMode: false,
  toggleTheme: () => {},
  theme: CombinedDefaultTheme,
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

  const theme = isDarkMode ? CombinedDarkTheme : CombinedDefaultTheme;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme }}>
      <PaperProvider theme={theme}>
        <NavigationContainer theme={theme}>
          {children}
        </NavigationContainer>
      </PaperProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;