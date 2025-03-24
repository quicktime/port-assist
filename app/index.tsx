import { Redirect } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  
  // While checking authentication state, return nothing
  if (isLoading) {
    return null;
  }
  
  // Route based on authentication state
  if (isAuthenticated) {
    return <Redirect href="/(app)" />;
  } else {
    return <Redirect href="/(auth)/login" />;
  }
}