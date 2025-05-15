'use client';

import { useRouter } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { LoginForm } from '@/components/login-form';

// 使用一个客户端组件来处理searchParams
function LoginContent() {
  const { session, isLoading } = useAuth();
  const router = useRouter();

  // 添加调试日志
  useEffect(() => {
    console.log('=== 登录页面状态 ===');
    console.log('会话状态:', session ? '已登录' : '未登录');
    console.log('认证上下文加载状态:', isLoading ? '加载中' : '已加载');
  }, [session, isLoading]);

  useEffect(() => {
    if (session && !isLoading) {
      console.log('会话已存在，准备跳转到dashboard');
      router.push('/dashboard');
    }
  }, [session, isLoading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoginForm />
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