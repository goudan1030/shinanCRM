'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

export default function LoginPage() {
  const { session, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // 如果已登录，直接跳转到仪表盘
    if (!isLoading && session) {
      router.push('/dashboard');
    }
  }, [session, isLoading, router]);

  // 如果正在加载或已登录，不显示任何内容
  if (isLoading || session) {
    return null;
  }

  // 显示登录表单
  return (
    // ... 原有的登录表单代码 ...
  );
} 