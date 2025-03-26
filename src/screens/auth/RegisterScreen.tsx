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

const RegisterScreen = () => {
  const { isDarkMode, toggleTheme } = useAppTheme();
  const paperTheme = useTheme();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [passwordVisible, setPasswordVisible] = useState<boolean>(false);

  async function register() {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });
    
    if (!error && !data.user) {
      setLoading(false);
      alert('Check your email for the login link!');
    } else if (error) {
      setLoading(false);
      alert(error.message);
    } else {
      setLoading(false);
      // Successfully signed up with user data available in data.user
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
              source={require('../../../assets/images/register.png')}
            />
          </View>
          
          <Surface
            style={[
              formStyles.formContainer,
              { backgroundColor: paperTheme.colors.background }
            ]}
          >
            <Text variant="headlineMedium" style={formStyles.title}>
              Register
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

            <TextInput
              label="Password"
              mode="outlined"
              placeholder="Enter your password"
              value={password}
              autoCapitalize="none"
              autoComplete="password"
              secureTextEntry={!passwordVisible}
              onChangeText={setPassword}
              style={formStyles.input}
              right={
                <TextInput.Icon 
                  icon={passwordVisible ? 'eye-off' : 'eye'} 
                  onPress={() => setPasswordVisible(!passwordVisible)}
                />
              }
            />
            
            <Button
              mode="contained"
              loading={loading}
              onPress={register}
              style={formStyles.buttonContainer}
            >
              {loading ? 'Loading...' : 'Create Account'}
            </Button>

            <View style={formStyles.linkContainer}>
              <Text variant="bodyMedium">Already have an account?</Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text
                  variant="bodyMedium"
                  style={[formStyles.link, { color: paperTheme.colors.primary }]}
                >
                  Login here
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

export default RegisterScreen;