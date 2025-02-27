'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { AuthState } from '@/types/auth';

const initialState: AuthState = {
  session: null,
  isLoading: true,
  error: null,
  operatorId: null,
};

const AuthContext = createContext<AuthState>(initialState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          credentials: 'include',
          cache: 'no-store'
        });
        const data = await response.json();
        
        if (data.user) {
          setState(prev => ({
            ...prev,
            session: {
              user: data.user
            },
            isLoading: false,
            operatorId: data.user.id
          }));
        } else {
          setState(prev => ({ ...prev, session: null, operatorId: null, isLoading: false }));
          // 如果不在登录页面且没有有效会话，重定向到登录页
          if (pathname !== '/login') {
            router.push('/login');
          }
        }
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          session: null, 
          operatorId: null, 
          isLoading: false, 
          error: error as Error 
        }));
        // 发生错误时也重定向到登录页
        if (pathname !== '/login') {
          router.push('/login');
        }
      }
    };

    checkSession();
  }, [pathname, router]); // 添加router作为依赖项

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