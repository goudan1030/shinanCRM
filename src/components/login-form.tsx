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
      
      // 调用登录API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '登录失败，请重试');
      }
      
      // 登录成功
      toast({
        title: "登录成功",
        description: "正在进入系统...",
      });
      
      // 使用较强的重定向方式，完全刷新页面，确保状态重置
      if (typeof window !== 'undefined') {
        window.location.href = '/dashboard';
      } else {
        router.push('/dashboard');
      }
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
