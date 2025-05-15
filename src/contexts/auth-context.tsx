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

  // 阻止不必要的重定向循环
  const isLoginPage = pathname === '/login';

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const checkSession = async () => {
      try {
        // 如果已经在登录页而且还在加载中，不要再次检查会话
        if (isLoginPage && state.isLoading) {
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }

        const response = await fetch('/api/auth/session', {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal
        });
        
        if (!isMounted) return;
        
        if (!response.ok) {
          throw new Error('会话检查失败');
        }
        
        const data = await response.json();
        
        if (!isMounted) return;
        
        if (data.user) {
          setState(prev => ({
            ...prev,
            session: {
              user: data.user
            },
            isLoading: false,
            operatorId: data.user.id
          }));
          
          // 如果在登录页且有有效会话，重定向到仪表板
          if (isLoginPage) {
            // 检查是否有原始URL需要返回
            const params = new URLSearchParams(window.location.search);
            const returnUrl = params.get('from') || '/dashboard';
            router.push(returnUrl);
          }
        } else {
          setState(prev => ({ ...prev, session: null, operatorId: null, isLoading: false }));
          
          // 仅当当前页面不是登录页且不在公开路径时重定向
          if (!isLoginPage && !isPublicPath(pathname)) {
            const returnPath = encodeURIComponent(pathname);
            router.push(`/login?from=${returnPath}`);
          }
        }
      } catch (error) {
        if (!isMounted) return;
        
        setState(prev => ({ 
          ...prev, 
          session: null, 
          operatorId: null, 
          isLoading: false, 
          error: error as Error 
        }));
        
        // 仅在不是登录页面时重定向
        if (!isLoginPage && !isPublicPath(pathname)) {
          router.push('/login');
        }
      }
    };

    checkSession();

    // 清理函数
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [pathname, router, isLoginPage]); // 添加isLoginPage作为依赖项

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

// 检查路径是否为公开路径（不需要认证）
function isPublicPath(path: string): boolean {
  const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password'];
  return publicPaths.some(p => path === p || path.startsWith(p));
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