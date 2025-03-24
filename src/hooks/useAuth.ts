// src/hooks/useAuth.ts
import { useContext } from 'react';
import { AuthContext } from '../provider/AuthProvider';

export function useAuth() {
  const auth = useContext(AuthContext);
  return {
    user: auth.user,
    session: auth.session,
    signOut: auth.signOut,
    isLoading: auth.user === null,
    isAuthenticated: auth.user === true,
  };
}