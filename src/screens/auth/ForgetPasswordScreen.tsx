import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { 
  ScrollView, 
  TouchableOpacity, 
  View, 
  KeyboardAvoidingView, 
  Image, 
  Platform 
} from 'react-native';
import { router } from 'expo-router';
import { 
  Text, 
  TextInput, 
  Button, 
  Surface, 
  useTheme, 
  IconButton 
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../initSupabase';
import { useAppTheme } from '../../provider/ThemeProvider';
import { commonStyles, formStyles, authStyles } from '../styles/common';

const ForgetPasswordScreen = () => {
  const { isDarkMode, toggleTheme } = useAppTheme();
  const paperTheme = useTheme();
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  async function resetPassword() {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'yourapp://reset-password',
    });
    
    if (!error) {
      setLoading(false);
      alert('Check your email to reset your password!');
    } else {
      setLoading(false);
      alert(error.message);
    }
  }
  
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      enabled 
      style={commonStyles.container}
    >
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <SafeAreaView style={commonStyles.container}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View
            style={[
              authStyles.imageContainer,
              { backgroundColor: isDarkMode ? '#1E1E1E' : '#f7f7f7' }
            ]}
          >
            <Image
              resizeMode="contain"
              style={authStyles.image}
              source={require('../../../assets/images/forget.png')}
            />
          </View>
          
          <Surface
            style={[
              formStyles.formContainer,
              { backgroundColor: paperTheme.colors.background }
            ]}
          >
            <Text variant="headlineMedium" style={formStyles.title}>
              Reset Password
            </Text>
            
            <Text variant="bodyMedium" style={{ textAlign: 'center', marginBottom: 20 }}>
              Enter your email address and we'll send you instructions to reset your password.
            </Text>
            
            <TextInput
              label="Email"
              mode="outlined"
              placeholder="Enter your email"
              value={email}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              style={formStyles.input}
            />
            
            <Button
              mode="contained"
              loading={loading}
              onPress={resetPassword}
              style={formStyles.buttonContainer}
              disabled={!email}
            >
              {loading ? 'Sending...' : 'Reset Password'}
            </Button>

            <View style={formStyles.linkContainer}>
              <Text variant="bodyMedium">Remember your password?</Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text
                  variant="bodyMedium"
                  style={[formStyles.link, { color: paperTheme.colors.primary }]}
                >
                  Back to login
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={authStyles.themeSwitchContainer}>
              <TouchableOpacity
                onPress={toggleTheme}
                style={authStyles.themeSwitch}
              >
                <IconButton
                  icon={isDarkMode ? 'white-balance-sunny' : 'moon-waning-crescent'}
                  size={20}
                />
                <Text variant="bodyMedium">
                  {isDarkMode ? 'Light theme' : 'Dark theme'}
                </Text>
              </TouchableOpacity>
            </View>
          </Surface>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default ForgetPasswordScreen;