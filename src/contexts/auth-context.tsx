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
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/login';

  const [state, setState] = useState(initialState);

  // 如果是登录页面，立即设置为非加载状态（优先级最高）
  useEffect(() => {
    if (isLoginPage) {
      setState(prev => {
        if (prev.isLoading) {
          console.log('登录页面，立即设置为非加载状态');
          return { ...prev, isLoading: false, session: null, operatorId: null };
        }
        return prev;
      });
    }
  }, [isLoginPage]);

  useEffect(() => {
    // 如果是登录页面，直接返回，不执行会话检查
    if (isLoginPage) {
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    // 添加超时保护，避免无限等待
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn('会话检查超时，强制设置为非加载状态');
        setState(prev => ({ 
          ...prev, 
          isLoading: false,
          session: null,
          operatorId: null
        }));
      }
    }, 10000); // 10秒超时

    const checkSession = async () => {
      try {
        
        // 非登录页面才需要检查会话
        const response = await fetch('/api/auth/session', {
          credentials: 'include',
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        if (!isMounted) {
          clearTimeout(timeoutId);
          return;
        }
        
        if (!response.ok) {
          throw new Error(`会话检查失败: ${response.status}`);
        }
        
        const data = await response.json() as SessionApiResponse;
        
        if (!isMounted) {
          clearTimeout(timeoutId);
          return;
        }
        
        if (data.user) {
          setState(prev => ({
            ...prev,
            session: {
              user: data.user!
            },
            isLoading: false,
            operatorId: String(data.user.id)
          }));
          clearTimeout(timeoutId);
        } else {
          setState(prev => ({ ...prev, session: null, operatorId: null, isLoading: false }));
          clearTimeout(timeoutId);
          
          // 仅当访问受保护的路径时重定向到登录页
          if (!isPublicPath(pathname)) {
            const returnPath = encodeURIComponent(pathname);
            console.log('无效会话，从受保护页面重定向到登录页');
            router.push(`/login?from=${returnPath}`);
          }
        }
      } catch (error) {
        if (!isMounted) {
          clearTimeout(timeoutId);
          return;
        }
        
        // 如果是AbortError，说明请求被取消，不需要处理
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('请求被取消');
          clearTimeout(timeoutId);
          return;
        }
        
        // 正确提取错误信息，避免显示 [object Object]
        const errorMessage = error instanceof Error ? error.message : String(error || '未知错误');
        console.error('会话检查失败:', errorMessage, error);
        
        setState(prev => ({ 
          ...prev, 
          session: null, 
          operatorId: null, 
          isLoading: false, 
          error: new Error(errorMessage)
        }));
        
        clearTimeout(timeoutId);
        
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
      clearTimeout(timeoutId);
    };
  }, [pathname, router, isLoginPage]); 

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

// 检查路径是否为公开路径（不需要认证）
function isPublicPath(path: string): boolean {
  const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/contracts/sign'];
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