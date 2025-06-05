#!/bin/bash

# 修复认证循环问题
echo "修复认证循环问题..."

ssh root@8.149.244.105 << 'EOT'
cd /www/wwwroot/sncrm

echo "1. 创建简化的登录页面..."
cat > src/app/\\(auth\\)/login/page.tsx << 'EOF'
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { LoginForm } from '@/components/login-form';

// 简化的登录内容组件
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [userSession, setUserSession] = useState<any>(null);
  const fromParam = searchParams.get('from');

  useEffect(() => {
    console.log('登录页面 - 开始检查认证状态');
    
    // 检查当前登录状态
    fetch('/api/auth/session', {
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache'
      }
    })
    .then(res => res.json())
    .then(data => {
      console.log('会话检查结果:', data);
      setUserSession(data.user);
      setIsCheckingAuth(false);
      
      // 如果已登录，重定向
      if (data.user) {
        console.log('用户已登录，准备重定向');
        const targetPath = fromParam || '/dashboard';
        setTimeout(() => {
          router.push(targetPath);
        }, 100);
      }
    })
    .catch(error => {
      console.error('检查会话失败:', error);
      setIsCheckingAuth(false);
    });
  }, [router, fromParam]);

  // 显示加载状态
  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">检查登录状态...</p>
      </div>
    );
  }

  // 已登录，显示跳转信息
  if (userSession) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg mb-2">您已登录</p>
          <p className="text-muted-foreground">正在跳转到 {fromParam || '仪表盘'}...</p>
        </div>
      </div>
    );
  }

  // 未登录，显示登录表单
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-6">SNCRM 登录</h1>
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
EOF

echo "2. 重新构建应用..."
npm run build

echo "3. 重启应用..."
pm2 restart sncrm

sleep 5

echo "4. 检查应用状态..."
pm2 status

echo "5. 测试访问..."
curl -I http://localhost:3001/login

EOT

echo "认证循环修复完成" 