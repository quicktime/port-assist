// Import registerRootComponent to ensure only one root is created
import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';

// Create the root component
export function App() {
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}

// Register ONLY ONE root component
registerRootComponent(App);