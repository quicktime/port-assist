import React from "react";
import { View, ScrollView, StyleSheet, Linking } from "react-native";
import {
  Appbar,
  Text,
  Card,
  Button,
  Surface,
  Divider,
  useTheme,
  List
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../provider/ThemeProvider";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router"; // Import router instead of navigation

const About = () => {
  const paperTheme = useTheme();
  const { isDarkMode, toggleTheme } = useAppTheme();

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <Appbar.Header>
        <Appbar.Content title="About" />
        <Appbar.Action
          icon={isDarkMode ? "white-balance-sunny" : "weather-night"}
          onPress={toggleTheme}
        />
      </Appbar.Header>
      
      <ScrollView style={{ flex: 1 }}>
        <View style={styles.container}>
          <Surface style={styles.section} elevation={2}>
            <Text variant="headlineMedium" style={styles.appTitle}>Investment Portfolio Tracker</Text>
            <Text variant="bodyMedium" style={styles.appVersion}>Version 1.0.0</Text>
            
            <View style={styles.appDescription}>
              <Text variant="bodyMedium">
                A comprehensive tool for tracking and managing your investment portfolio. 
                Monitor stocks, analyze options data with Greeks, and track your investment goals.
              </Text>
            </View>
            
            <View style={styles.features}>
              <View style={styles.featureItem}>
                <MaterialCommunityIcons name="chart-line" size={24} color={paperTheme.colors.primary} />
                <Text variant="bodyMedium" style={styles.featureText}>Portfolio tracking with real-time updates</Text>
              </View>
              
              <View style={styles.featureItem}>
                <MaterialCommunityIcons name="chart-timeline-variant" size={24} color={paperTheme.colors.primary} />
                <Text variant="bodyMedium" style={styles.featureText}>Options chain data with Greeks analysis</Text>
              </View>
              
              <View style={styles.featureItem}>
                <MaterialCommunityIcons name="calendar-check" size={24} color={paperTheme.colors.primary} />
                <Text variant="bodyMedium" style={styles.featureText}>Investment contribution planning tools</Text>
              </View>
            </View>
          </Surface>
          
          <Surface style={styles.section} elevation={2}>
            <Text variant="titleLarge" style={styles.sectionTitle}>Technologies Used</Text>
            
            <List.Item
              title="React Native"
              description="Build cross-platform mobile applications"
              left={props => <List.Icon {...props} icon="react" />}
            />
            
            <Divider />
            
            <List.Item
              title="Expo"
              description="Build universal native apps for Android, iOS, and web"
              left={props => <List.Icon {...props} icon="cellphone-link" />}
            />
            
            <Divider />
            
            <List.Item
              title="Supabase"
              description="Backend as a service with PostgreSQL database"
              left={props => <List.Icon {...props} icon="database" />}
            />
            
            <Divider />
            
            <List.Item
              title="React Navigation"
              description="Navigation library for React Native"
              left={props => <List.Icon {...props} icon="navigation" />}
            />
            
            <Divider />
            
            <List.Item
              title="React Native Paper"
              description="Material Design for React Native"
              left={props => <List.Icon {...props} icon="material-design" />}
            />
          </Surface>
          
          <Surface style={styles.section} elevation={2}>
            <Text variant="titleLarge" style={styles.sectionTitle}>Contact & Support</Text>
            
            <View style={styles.supportLinks}>
              <Button
                mode="contained"
                icon="help-circle"
                onPress={() => Linking.openURL('https://example.com/help')}
                style={styles.supportButton}
              >
                Help Center
              </Button>
              
              <Button
                mode="contained"
                icon="email"
                onPress={() => Linking.openURL('mailto:support@example.com')}
                style={styles.supportButton}
              >
                Contact Support
              </Button>
              
              <Button
                mode="contained"
                icon="github"
                onPress={() => Linking.openURL('https://github.com/yourusername/portfolio-tracker')}
                style={styles.supportButton}
              >
                GitHub Repository
              </Button>
            </View>
          </Surface>
          
          <Text variant="bodySmall" style={styles.copyright}>
            © {new Date().getFullYear()} Investment Portfolio Tracker. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  section: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  appTitle: {
    textAlign: 'center',
  },
  appVersion: {
    textAlign: 'center',
    marginBottom: 16,
  },
  appDescription: {
    marginVertical: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  features: {
    marginTop: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    marginLeft: 12,
  },
  supportLinks: {
    marginTop: 8,
  },
  supportButton: {
    marginBottom: 12,
  },
  copyright: {
    textAlign: 'center',
    marginVertical: 16,
    opacity: 0.6,
  },
});

export default About;