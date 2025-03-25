// app/(app)/options-chain/[symbol].tsx
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function OptionsChainRedirect() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  
  // Redirect to the new URL structure
  return <Redirect href={`/options/chain/${symbol}`} />;
}