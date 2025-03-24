// Define all navigation types in a single file for easier management

// Import NavigatorScreenParams to handle nested navigators
import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabsParamList = {
  Home: undefined;
  Portfolio: undefined;
  Profile: undefined;
  About: undefined;
};

export type MainStackParamList = {
  // Main tabs container with support for nested navigation
  MainTabs: NavigatorScreenParams<MainTabsParamList>;
  
  // Stock screens
  AddStock: undefined;
  EditStock: {
    item: {
      id?: string;
      symbol: string;
      shares: number;
      avg_price: number;
      target_price?: number;
      notes?: string;
    };
  };
  
  // Options screens
  OptionsChain: {
    symbol: string;
  };
  OptionDetail: {
    option: any; // Using any here for simplicity, but should be properly typed in a production app
  };
  
  // Other screens
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgetPassword: undefined;
};