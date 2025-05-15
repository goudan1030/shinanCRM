'use client';

import { useState, useEffect, Suspense, ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';

interface LoginResponse {
  error?: string;
  [key: string]: any;
}

// 创建一个内部组件，处理搜索参数逻辑
function LoginFormContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // 获取原始URL，如果有的话
  const returnTo = searchParams.get('from') || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log('=== 开始提交登录表单 ===');
    console.log('表单数据:', { email: formData.email, passwordProvided: !!formData.password });
    console.log('登录成功后将跳转到:', returnTo);

    try {
      console.log('发送登录请求...');
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });

      const data = await response.json() as LoginResponse;
      console.log('收到服务器响应:', { status: response.status });

      if (!response.ok) {
        console.log('✗ 请求失败:', data.error);
        throw new Error(data.error || '登录失败');
      }

      if (data.error) {
        console.log('✗ 服务器返回错误:', data.error);
        throw new Error(data.error);
      }

      console.log('✓ 登录成功，准备跳转到:', returnTo);
      
      // 添加一个短暂延迟以确保cookie已设置
      setTimeout(() => {
        router.push(returnTo);
        router.refresh();
      }, 100);
      
    } catch (error) {
      console.error('✗ 登录过程出错:', error);
      toast({
        variant: 'destructive',
        title: '登录失败',
        description: error instanceof Error ? error.message : '邮箱或密码错误'
      });
    } finally {
      setLoading(false);
      console.log('=== 登录表单提交完成 ===');
    }
  };

  // 处理输入变化
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>, field: 'email' | 'password') => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">欢迎回来</h1>
                <p className="text-balance text-muted-foreground">
                  请登录您的账号
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="请输入邮箱地址"
                  required
                  value={formData.email}
                  onChange={(e) => handleInputChange(e, 'email')}
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">密码</Label>
                  <a
                    href="#"
                    className="ml-auto text-sm underline-offset-2 hover:underline"
                  >
                    忘记密码？
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => handleInputChange(e, 'password')}
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "登录中..." : "登录"}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                暂不支持对外注册
              </div>
            </div>
          </form>
          <div className="relative hidden bg-muted md:block">
            <Image
              src="/placeholder.svg"
              alt="Image"
              width={500}
              height={500}
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
        点击登录即表示您同意我们的<a href="#">服务条款</a>和<a href="#">隐私政策</a>
      </div>
    </div>
  );
}

// 导出一个包装组件，使用Suspense
export function LoginForm(props: React.ComponentProps<"div">) {
  return (
    <Suspense fallback={<div className="flex flex-col gap-6">加载中...</div>}>
      <LoginFormContent {...props} />
    </Suspense>
  );
}
