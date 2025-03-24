// src/screens/auth/Register.tsx
import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  ScrollView,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Image,
  StyleSheet,
} from "react-native";
import { supabase } from "../../initSupabase";
import {
  Text,
  TextInput,
  Button,
  useTheme,
  Surface,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../../provider/ThemeProvider";
import { router } from "expo-router"; // Import router

export default function Register() { // Remove navigation props
  const { isDarkMode, toggleTheme } = useAppTheme();
  const theme = useTheme();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  async function register() {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });
    
    if (!error && !data.user) {
      setLoading(false);
      alert("Check your email for the login link!");
    } else if (error) {
      setLoading(false);
      alert(error.message);
    } else {
      setLoading(false);
      // Successfully signed up with user data available in data.user
    }
  }
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <KeyboardAvoidingView behavior="height" style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
          }}
        >
          <View
            style={[
              styles.imageContainer,
              {
                backgroundColor: isDarkMode ? "#17171E" : theme.colors.surfaceVariant,
              }
            ]}
          >
            <Image
              resizeMode="contain"
              style={styles.image}
              source={require("../../../assets/images/register.png")}
            />
          </View>
          <Surface style={styles.formContainer}>
            <Text
              variant="headlineMedium"
              style={styles.headerText}
            >
              Register
            </Text>
            
            <Text variant="bodyMedium">Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              value={email}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={(text) => setEmail(text)}
              mode="outlined"
            />

            <Text style={styles.labelText} variant="bodyMedium">Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              value={password}
              autoCapitalize="none"
              autoComplete="password"
              secureTextEntry={true}
              onChangeText={(text) => setPassword(text)}
              mode="outlined"
            />
            
            <Button
              mode="contained"
              onPress={register}
              style={styles.button}
              loading={loading}
              disabled={loading}
            >
              {loading ? "Loading" : "Create an account"}
            </Button>

            <View style={styles.linkContainer}>
              <Text variant="bodyMedium">Already have an account?</Text>
              <TouchableOpacity
                onPress={() => {
                  router.push("/login"); // Use router instead of navigation
                }}
              >
                <Text
                  variant="bodyMedium"
                  style={[styles.linkText, { color: theme.colors.primary }]}
                >
                  Login here
                </Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={styles.themeToggle}
              onPress={toggleTheme}
            >
              <Text
                variant="bodyMedium"
                style={{ fontWeight: 'bold' }}
              >
                {isDarkMode ? "☀️ light theme" : "🌑 dark theme"}
              </Text>
            </TouchableOpacity>
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    height: 220,
    width: 220,
  },
  formContainer: {
    flex: 3,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerText: {
    alignSelf: "center",
    padding: 30,
    fontWeight: 'bold',
  },
  labelText: {
    marginTop: 15,
  },
  input: {
    marginTop: 10,
    marginBottom: 5,
  },
  button: {
    marginTop: 20,
  },
  linkContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    justifyContent: "center",
  },
  linkText: {
    marginLeft: 5,
    fontWeight: 'bold',
  },
  themeToggle: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 30,
    justifyContent: "center",
  }
});