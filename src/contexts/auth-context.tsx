'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { AuthState, Session } from '@/types/auth';

const initialState: AuthState = {
  session: null,
  isLoading: true,
  error: null,
  operatorId: null,
};

const AuthContext = createContext<AuthState>(initialState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setState(prev => ({
        ...prev,
        session: session as Session,
        isLoading: false,
        operatorId: session?.user?.id || null,
      }));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useOperatorId = () => {
  const { operatorId } = useAuth();
  if (!operatorId) {
    throw new Error('No operator ID found. Please ensure user is logged in.');
  }
  return operatorId;
};