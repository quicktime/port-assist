import React from 'react';
import { View, ScrollView, StyleSheet, Linking } from 'react-native';
import { Text, Card, Button, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BaseScreen from '../components/BaseScreen';
import { commonStyles } from '../styles/common';

const AboutScreen = () => {
  return (
    <BaseScreen title="About">
      <ScrollView style={commonStyles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.title}>
              Investment Portfolio Tracker
            </Text>
            <Text variant="bodyMedium" style={styles.version}>
              Version 1.0.0
            </Text>
            
            <Divider style={commonStyles.divider} />
            
            <Text variant="bodyMedium" style={styles.description}>
              Track your investments, monitor options positions, and analyze your portfolio performance with real-time data.
            </Text>
            
            <View style={styles.featureSection}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Key Features
              </Text>
              <View style={styles.feature}>
                <MaterialCommunityIcons name="chart-line" size={24} style={styles.featureIcon} />
                <Text variant="bodyMedium">Real-time stock tracking</Text>
              </View>
              <View style={styles.feature}>
                <MaterialCommunityIcons name="chart-timeline-variant" size={24} style={styles.featureIcon} />
                <Text variant="bodyMedium">Options chain data with greeks</Text>
              </View>
              <View style={styles.feature}>
                <MaterialCommunityIcons name="finance" size={24} style={styles.featureIcon} />
                <Text variant="bodyMedium">AI-powered trade recommendations</Text>
              </View>
              <View style={styles.feature}>
                <MaterialCommunityIcons name="cash-multiple" size={24} style={styles.featureIcon} />
                <Text variant="bodyMedium">Cash management tools</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
        
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Data Sources
            </Text>
            <Divider style={commonStyles.divider} />
            
            <View style={styles.dataSource}>
              <Text variant="bodyMedium" style={styles.dataSourceName}>
                Stock & Options Data
              </Text>
              <Text variant="bodySmall">
                Powered by Polygon.io API
              </Text>
              <Button
                mode="text"
                onPress={() => Linking.openURL('https://polygon.io')}
                style={styles.linkButton}
              >
                Visit Website
              </Button>
            </View>
            
            <View style={styles.dataSource}>
              <Text variant="bodyMedium" style={styles.dataSourceName}>
                AI Trade Recommendations
              </Text>
              <Text variant="bodySmall">
                Powered by Anthropic Claude API
              </Text>
              <Button
                mode="text"
                onPress={() => Linking.openURL('https://www.anthropic.com/claude')}
                style={styles.linkButton}
              >
                Learn More
              </Button>
            </View>
          </Card.Content>
        </Card>
        
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Contact & Support
            </Text>
            <Divider style={commonStyles.divider} />
            
            <Button
              mode="contained-tonal"
              icon="email-outline"
              onPress={() => Linking.openURL('mailto:support@portfolio-assist.com')}
              style={styles.button}
            >
              Email Support
            </Button>
            
            <Button
              mode="contained-tonal"
              icon="frequently-asked-questions"
              onPress={() => Linking.openURL('https://portfolio-assist.com/faq')}
              style={styles.button}
            >
              FAQ
            </Button>
            
            <Button
              mode="contained-tonal"
              icon="github"
              onPress={() => Linking.openURL('https://github.com/your-repo/portfolio-assist')}
              style={styles.button}
            >
              GitHub Repository
            </Button>
          </Card.Content>
        </Card>
        
        <Text style={styles.copyright}>
          © 2025 Portfolio Assist. All rights reserved.
        </Text>
      </ScrollView>
    </BaseScreen>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 8,
  },
  title: {
    textAlign: 'center',
  },
  version: {
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.7,
  },
  description: {
    marginVertical: 12,
    lineHeight: 22,
  },
  featureSection: {
    marginTop: 16,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    marginRight: 12,
  },
  dataSource: {
    marginBottom: 16,
  },
  dataSourceName: {
    fontWeight: 'bold',
  },
  linkButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  button: {
    marginBottom: 12,
  },
  copyright: {
    textAlign: 'center',
    marginVertical: 24,
    opacity: 0.6,
  },
});

export default AboutScreen;