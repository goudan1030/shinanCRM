#!/bin/bash

# 创建备份目录
echo "创建备份目录..."
mkdir -p /www/wwwroot/sncrm/backups

# 备份原始登录表单文件
echo "备份原始登录表单文件..."
if [ -f "/www/wwwroot/sncrm/src/components/login-form.tsx" ]; then
  cp /www/wwwroot/sncrm/src/components/login-form.tsx /www/wwwroot/sncrm/backups/login-form.tsx.bak
fi

# 修改登录表单组件，优化登录后的重定向逻辑
echo "修改登录表单组件..."
cat > /www/wwwroot/sncrm/src/components/login-form.tsx << 'EOL'
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface LoginFormProps extends React.ComponentPropsWithoutRef<"div"> {
  className?: string;
}

export function LoginForm({ className, ...props }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // 表单验证
    if (!email || !password) {
      setError('请输入邮箱和密码');
      return;
    }
    
    try {
      setLoading(true);
      
      // 打印调试信息
      console.log('开始登录请求...');
      
      // 调用登录API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 添加特殊头部避免缓存
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
        body: JSON.stringify({ email, password }),
        // 确保包含凭证
        credentials: 'include',
      });
      
      console.log('登录响应状态:', response.status);
      
      const data = await response.json();
      console.log('登录响应数据:', data);
      
      if (!response.ok) {
        throw new Error(data.error || '登录失败，请重试');
      }
      
      // 登录成功
      toast({
        title: "登录成功",
        description: "正在进入系统...",
      });
      
      console.log('登录成功，准备重定向到仪表板...');
      
      // 使用硬重定向，完全刷新页面，确保状态重置
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          console.log('执行页面重定向...');
          // 使用显式的URL包含timestamp参数，避免缓存
          const timestamp = new Date().getTime();
          window.location.href = `/dashboard?t=${timestamp}`;
        }
      }, 500);
    } catch (error) {
      console.error('登录失败:', error);
      setError(error instanceof Error ? error.message : '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <a
              href="/"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-md">
                <Image
                  src="/logo.svg"
                  alt="CRM系统"
                  width={36}
                  height={36}
                  className="rounded-md"
                  priority
                  unoptimized
                />
              </div>
              <span className="sr-only">CRM系统</span>
            </a>
            <h1 className="text-xl font-bold">欢迎使用CRM系统</h1>
          </div>
          
          {error && (
            <Alert variant="destructive" className="mb-2">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="text" 
                placeholder="请输入邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '登录中...' : '登录'}
            </Button>
          </div>
        </div>
      </form>
      
      <div className="text-balance text-center text-xs text-muted-foreground">
        版权所有 © {new Date().getFullYear()} CRM系统
      </div>
    </div>
  );
}
EOL

# 修改登录页面组件，确保正确处理重定向
echo "修改登录页面组件..."
if [ -f "/www/wwwroot/sncrm/src/app/(auth)/login/page.tsx" ]; then
  cp /www/wwwroot/sncrm/src/app/(auth)/login/page.tsx /www/wwwroot/sncrm/backups/login-page.tsx.bak
fi

cat > /www/wwwroot/sncrm/src/app/(auth)/login/page.tsx << 'EOL'
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
    
    // 将调试信息添加到全局对象，便于查看
    if (typeof window !== 'undefined') {
      (window as any).debugInfo = {
        session: session ? '已登录' : '未登录',
        isLoading,
        fromParam: fromParam || '无',
        redirected,
        timestamp: new Date().toISOString()
      };
    }
  }, [session, isLoading, fromParam, redirected]);

  // 更强的重定向逻辑，直接使用window.location
  useEffect(() => {
    // 只有当认证加载完成，用户已登录，且尚未执行过重定向时才进行重定向
    if (!isLoading && session && !redirected) {
      console.log('检测到登录状态，准备重定向...');
      setRedirected(true); // 标记已重定向，防止重复
      
      // 使用setTimeout确保状态更新完成后再执行重定向
      setTimeout(() => {
        if (fromParam) {
          console.log('重定向回原始页面:', fromParam);
          window.location.href = fromParam;
        } else {
          console.log('重定向到仪表盘');
          // 添加时间戳参数避免缓存
          const timestamp = new Date().getTime();
          window.location.href = `/dashboard?t=${timestamp}`;
        }
      }, 100);
    }
  }, [session, isLoading, fromParam, redirected]);

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
EOL

# 重新编译应用
echo "重新编译应用..."
cd /www/wwwroot/sncrm
NODE_ENV=production npm run build

# 重启应用
echo "重启应用..."
pm2 restart sncrm

echo "登录表单和页面已修复。请尝试清除浏览器缓存后再次登录。" 