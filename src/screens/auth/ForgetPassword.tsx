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
import { AuthStackParamList } from "../../types/navigation";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Text,
  TextInput,
  Button,
  useTheme,
  Surface,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../../provider/ThemeProvider";

export default function ForgetPassword({
  navigation,
}: NativeStackScreenProps<AuthStackParamList, "ForgetPassword">) {
  const { isDarkMode, toggleTheme } = useAppTheme();
  const theme = useTheme();
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  async function forget() {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'yourapp://reset-password',
    });
    
    if (!error) {
      setLoading(false);
      alert("Check your email to reset your password!");
    } else {
      setLoading(false);
      alert(error.message);
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
              source={require("../../../assets/images/forget.png")}
            />
          </View>
          <Surface style={styles.formContainer}>
            <Text
              variant="headlineMedium"
              style={styles.headerText}
            >
              Forget Password
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
            
            <Button
              mode="contained"
              onPress={forget}
              style={styles.button}
              loading={loading}
              disabled={loading}
            >
              {loading ? "Loading" : "Send email"}
            </Button>

            <View style={styles.linkContainer}>
              <Text variant="bodyMedium">Already have an account?</Text>
              <TouchableOpacity
                onPress={() => {
                  navigation.navigate("Login");
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