'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { LoginForm } from '@/components/login-form';

// 使用一个客户端组件来处理searchParams
function LoginContent() {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [redirected, setRedirected] = useState(false);
  const fromParam = searchParams.get('from');

  useEffect(() => {
    // 用于调试的日志
    console.log('=== 登录页面状态 ===');
    console.log('会话状态:', session ? '已登录' : '未登录');
    console.log('认证上下文加载状态:', isLoading ? '加载中' : '已加载');
    console.log('来源路径:', fromParam || '无');
    console.log('已进行过重定向:', redirected);
  }, [session, isLoading, fromParam, redirected]);

  useEffect(() => {
    // 只有当认证加载完成，用户已登录，且尚未执行过重定向时才进行重定向
    if (!isLoading && session && !redirected) {
      setRedirected(true); // 标记已重定向，防止重复
      
      if (fromParam) {
        console.log('会话已存在，重定向回原始页面:', fromParam);
        router.push(fromParam);
      } else {
        console.log('会话已存在，重定向到仪表盘');
        router.push('/dashboard');
      }
    }
  }, [session, isLoading, router, fromParam, redirected]);

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  // 如果已登录但等待重定向，也显示加载状态
  if (session && !redirected) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">已登录，正在跳转...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">加载中...</div>}>
      <LoginContent />
    </Suspense>
  );
}