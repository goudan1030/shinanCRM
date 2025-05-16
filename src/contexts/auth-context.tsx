'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { AuthState, User } from '@/types/auth';

// 定义简化的会话类型，用于本地状态管理
interface SimpleSession {
  user: User;
}

// 定义API响应类型
interface SessionApiResponse {
  user: User | null;
}

// 修改初始状态类型适配简化会话类型
const initialState: Omit<AuthState, 'session'> & { session: SimpleSession | null } = {
  session: null,
  isLoading: true,
  error: null,
  operatorId: null,
};

const AuthContext = createContext<typeof initialState>(initialState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(initialState);
  const pathname = usePathname();
  const router = useRouter();

  // 阻止不必要的重定向循环
  const isLoginPage = pathname === '/login';

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const checkSession = async () => {
      try {
        // 如果已经在登录页面，标记为非加载状态但不立即重定向
        if (isLoginPage) {
          const response = await fetch('/api/auth/session', {
            credentials: 'include',
            signal: controller.signal,
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate',
              'Pragma': 'no-cache'
            }
          });
          
          if (!isMounted) return;
          
          if (!response.ok) {
            setState(prev => ({ ...prev, isLoading: false }));
            return;
          }
          
          const data = await response.json() as SessionApiResponse;
          
          if (!isMounted) return;
          
          if (data.user) {
            // 设置会话状态
            setState(prev => ({
              ...prev,
              session: {
                user: data.user
              },
              isLoading: false,
              operatorId: String(data.user.id)
            }));
            
            // 在登录页且有会话时，只有在直接访问登录页（没有重定向参数）时才重定向到仪表板
            if (typeof window !== 'undefined') {
              const searchParams = new URLSearchParams(window.location.search);
              if (!searchParams.has('from')) {
                console.log('有效会话，从登录页重定向到仪表板');
                router.push('/dashboard');
              }
            }
          } else {
            // 如果没有会话，只需更新状态
            setState(prev => ({ ...prev, session: null, operatorId: null, isLoading: false }));
          }
        } else {
          // 非登录页面的会话检查
          const response = await fetch('/api/auth/session', {
            credentials: 'include',
            signal: controller.signal,
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate',
              'Pragma': 'no-cache'
            }
          });
          
          if (!isMounted) return;
          
          if (!response.ok) {
            throw new Error('会话检查失败');
          }
          
          const data = await response.json() as SessionApiResponse;
          
          if (!isMounted) return;
          
          if (data.user) {
            setState(prev => ({
              ...prev,
              session: {
                user: data.user
              },
              isLoading: false,
              operatorId: String(data.user.id)
            }));
          } else {
            setState(prev => ({ ...prev, session: null, operatorId: null, isLoading: false }));
            
            // 仅当访问受保护的路径时重定向到登录页
            if (!isPublicPath(pathname)) {
              const returnPath = encodeURIComponent(pathname);
              console.log('无效会话，从受保护页面重定向到登录页');
              router.push(`/login?from=${returnPath}`);
            }
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
        
        // 仅在非登录页面且访问受保护的路径时重定向
        if (!isLoginPage && !isPublicPath(pathname)) {
          console.log('会话检查异常，重定向到登录页');
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
  }, [pathname, router, isLoginPage]); 

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