'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { LoginForm } from '@/components/login-form';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, isLoading } = useAuth();
  const returnTo = searchParams.get('from') || '/dashboard';

  // 添加调试日志
  useEffect(() => {
    console.log('=== 登录页面状态 ===');
    console.log('会话状态:', session ? '已登录' : '未登录');
    console.log('认证上下文加载状态:', isLoading ? '加载中' : '已加载');
    console.log('预期跳转地址:', returnTo);
  }, [session, isLoading, returnTo]);

  useEffect(() => {
    if (session && !isLoading) {
      console.log('会话已存在，准备跳转到:', returnTo);
      router.push(returnTo);
    }
  }, [session, isLoading, router, returnTo]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoginForm />
    </div>
  );
}