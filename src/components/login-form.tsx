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

interface LoginResponse {
  success: boolean;
  error?: string;
  token?: string;
  user?: {
    id: string;
    email: string;
    role: string;
  };
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
      
      // 调试信息
      console.log('开始登录请求...');
      console.log('检测环境:', {
        isNetlify: typeof window !== 'undefined' && window.location.hostname.includes('netlify'),
        hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
        protocol: typeof window !== 'undefined' ? window.location.protocol : 'unknown'
      });
      
      // 调用登录API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 添加防缓存头
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
        body: JSON.stringify({ email, password }),
        // 确保包含凭证 - 对Netlify特别重要
        credentials: 'include',
      });
      
      console.log('登录响应状态:', response.status);
      console.log('响应头信息:', {
        'set-cookie': response.headers.get('set-cookie'),
        'content-type': response.headers.get('content-type')
      });
      
      const data = await response.json() as LoginResponse;
      console.log('登录响应数据:', data);
      
      if (!response.ok) {
        throw new Error(data.error || '登录失败，请重试');
      }
      
      // 登录成功
      toast({
        title: "登录成功",
        description: "正在进入系统...",
      });
      
      console.log('登录成功，准备重定向...');
      
      // 改进的重定向策略 - 针对Netlify优化
      const redirectPath = '/dashboard';
      
      // 方法1: 先尝试客户端路由
      setTimeout(() => {
        console.log('尝试客户端路由重定向到:', redirectPath);
        router.push(redirectPath);
        
        // 方法2: 如果客户端路由失败，使用硬重定向
        setTimeout(() => {
                     console.log('客户端路由可能失败，使用硬重定向');
           if (typeof window !== 'undefined') {
             window.location.href = redirectPath;
           }
        }, 1000);
      }, 200);
      
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
                onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
                required
                disabled={loading}
                autoComplete="username email"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
                required
                disabled={loading}
                autoComplete="current-password"
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
