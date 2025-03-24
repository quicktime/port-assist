
import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  ScrollView,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Image,
  StyleSheet,
  Platform,
} from "react-native";
import { supabase } from "../../src/initSupabase";
import {
  Text,
  TextInput,
  Button,
  Surface,
  useTheme,
  IconButton,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../../src/provider/ThemeProvider";
import { router } from "expo-router";

export default function Login() {
  const { isDarkMode, toggleTheme } = useAppTheme();
  const paperTheme = useTheme();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [passwordVisible, setPasswordVisible] = useState<boolean>(false);

  async function login() {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
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
      // Successfully signed in - router will handle navigation
    }
  }
  
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      enabled 
      style={{ flex: 1 }}
    >
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
          }}
        >
          <View
            style={[
              styles.imageContainer,
              { backgroundColor: isDarkMode ? "#1E1E1E" : "#f7f7f7" }
            ]}
          >
            <Image
              resizeMode="contain"
              style={styles.image}
              source={require("../../assets/images/login.png")}
            />
          </View>
          <Surface
            style={[
              styles.formContainer,
              { backgroundColor: isDarkMode ? paperTheme.colors.background : paperTheme.colors.background }
            ]}
          >
            <Text
              variant="headlineMedium"
              style={styles.title}
            >
              Login
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
              style={styles.input}
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
              style={styles.input}
              right={
                <TextInput.Icon 
                  icon={passwordVisible ? "eye-off" : "eye"} 
                  onPress={() => setPasswordVisible(!passwordVisible)}
                />
              }
            />
            
            <Button
              mode="contained"
              loading={loading}
              onPress={login}
              style={styles.button}
            >
              {loading ? "Loading..." : "Continue"}
            </Button>

            <View style={styles.linkContainer}>
              <Text variant="bodyMedium">Don't have an account?</Text>
              <TouchableOpacity
                onPress={() => {
                  router.push('/(auth)/register');
                }}
              >
                <Text
                  variant="bodyMedium"
                  style={[styles.link, { color: paperTheme.colors.primary }]}
                >
                  Register here
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.linkContainer}>
              <TouchableOpacity
                onPress={() => {
                  router.push('/(auth)/forget-password');
                }}
              >
                <Text
                  variant="bodyMedium"
                  style={[styles.link, { color: paperTheme.colors.primary }]}
                >
                  Forgot password?
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.themeSwitchContainer}>
              <TouchableOpacity
                onPress={toggleTheme}
                style={styles.themeSwitch}
              >
                <IconButton
                  icon={isDarkMode ? "white-balance-sunny" : "moon-waning-crescent"}
                  size={20}
                />
                <Text variant="bodyMedium">
                  {isDarkMode ? "Light theme" : "Dark theme"}
                </Text>
              </TouchableOpacity>
            </View>
          </Surface>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  image: {
    height: 220,
    width: 220,
  },
  formContainer: {
    flex: 3,
    padding: 20,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    elevation: 4,
  },
  title: {
    alignSelf: "center",
    marginVertical: 30,
    fontWeight: "bold",
  },
  input: {
    marginVertical: 8,
  },
  button: {
    marginTop: 20,
    paddingVertical: 6,
  },
  linkContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  link: {
    fontWeight: "bold",
    marginLeft: 5,
  },
  themeSwitchContainer: {
    alignItems: "center",
    marginTop: 30,
  },
  themeSwitch: {
    flexDirection: "row",
    alignItems: "center",
  }
});