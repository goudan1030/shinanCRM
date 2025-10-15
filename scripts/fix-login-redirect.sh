#!/bin/bash

# 修复登录重定向问题的脚本
echo "开始修复登录重定向问题..."

# 设置变量
SERVER_IP="121.41.65.220"
SERVER_USER="root"

# 远程执行命令
ssh $SERVER_USER@$SERVER_IP << 'EOT'
# 进入项目目录
cd /www/wwwroot/sncrm

# 检查和修复登录页面跳转逻辑
echo "修复登录页面跳转逻辑..."
cat > pages/login/index.tsx << 'EOF'
import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { AuthResponse } from '../../types';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 检查是否已登录，如果已登录则直接跳转到仪表盘
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        
        if (data.authenticated && data.user) {
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('检查会话失败:', error);
      }
    };
    
    checkSession();
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json() as AuthResponse;

      if (response.ok) {
        console.log('登录成功，准备跳转到仪表盘...');
        // 强制设置cookie
        document.cookie = "user_logged_in=true; path=/; max-age=604800";
        // 确保跳转发生
        setTimeout(() => {
          router.push('/dashboard');
        }, 100);
      } else {
        setError(data.message || '登录失败');
      }
    } catch (err) {
      setError('登录失败，请稍后再试');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>登录 - CRM系统</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              CRM系统登录
            </h2>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email-address" className="sr-only">
                  邮箱地址
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="邮箱地址"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  密码
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                  loading ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
              >
                {loading ? '登录中...' : '登录'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
EOF

# 修复登录API
echo "修复登录API..."
cat > pages/api/auth/login.ts << 'EOF'
import type { NextApiRequest, NextApiResponse } from 'next';
import { setCookie } from 'cookies-next';
import { AuthResponse, User } from '../../../types';

export default function handler(req: NextApiRequest, res: NextApiResponse<AuthResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    // 在实际应用中，这里应该验证用户凭据
    // 为简化起见，我们允许任何有效的电子邮件和密码登录
    if (!email || !password) {
      return res.status(400).json({ success: false, message: '请提供邮箱和密码' });
    }

    // 创建认证令牌
    const token = `auth-token-${Date.now()}`;
    
    // 设置Cookie - 明确指定域名
    setCookie('auth_token', token, { 
      req, 
      res, 
      maxAge: 60 * 60 * 24 * 7, // 7天
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      domain: 'crm.xinghun.info',
      secure: false
    });
    
    // 设置前端可见的登录状态Cookie
    setCookie('user_logged_in', 'true', { 
      req, 
      res, 
      maxAge: 60 * 60 * 24 * 7, // 7天
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      domain: 'crm.xinghun.info',
      secure: false
    });

    // 显式添加Set-Cookie头，确保cookie被设置
    res.setHeader('Set-Cookie', [
      `auth_token=${token}; Path=/; Max-Age=${60 * 60 * 24 * 7}; HttpOnly; SameSite=Lax`,
      `user_logged_in=true; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`
    ]);

    const user: User = {
      id: 1,
      name: '管理员',
      email
    };

    return res.status(200).json({ 
      success: true, 
      message: '登录成功',
      user
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: '登录失败，请稍后再试' });
  }
}
EOF

# 修复会话API
echo "修复会话API..."
cat > pages/api/auth/session.ts << 'EOF'
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCookie } from 'cookies-next';
import { SessionResponse, User } from '../../../types';

export default function handler(req: NextApiRequest, res: NextApiResponse<SessionResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ authenticated: false, message: 'Method not allowed' });
  }

  try {
    // 检查cookie
    console.log('Cookies:', req.cookies);
    const authToken = getCookie('auth_token', { req, res });
    const userLoggedIn = getCookie('user_logged_in', { req, res });
    
    console.log('Auth token:', authToken);
    console.log('User logged in:', userLoggedIn);
    
    if (!authToken && !userLoggedIn) {
      return res.status(200).json({ authenticated: false });
    }
    
    // 只要有任一cookie存在，就认为用户已登录
    const user: User = {
      id: 1,
      name: '管理员'
    };

    return res.status(200).json({
      authenticated: true,
      user
    });
  } catch (error) {
    console.error('Session verification error:', error);
    return res.status(500).json({ 
      authenticated: false,
      message: '会话验证失败'
    });
  }
}
EOF

# 修复仪表盘页面，确保能正确检查登录状态
echo "修复仪表盘页面..."
cat > pages/dashboard/index.tsx << 'EOF'
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { User, SessionResponse } from '../../types';

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchUser() {
      try {
        console.log('检查用户会话...');
        const res = await fetch('/api/auth/session');
        const data = await res.json() as SessionResponse;
        console.log('会话数据:', data);

        if (!data.authenticated) {
          console.log('未认证，重定向到登录页...');
          router.push('/login');
          return;
        }

        if (data.user) {
          console.log('已获取用户信息:', data.user);
          setUser(data.user);
        }
      } catch (error) {
        console.error('获取用户会话失败:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    // 检查Cookie
    const isLoggedIn = document.cookie.includes('user_logged_in=true');
    console.log('客户端检查Cookie:', isLoggedIn);

    if (!isLoggedIn) {
      console.log('未检测到登录Cookie，重定向到登录页...');
      router.push('/login');
      return;
    }

    fetchUser();
  }, [router]);

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      // 清除客户端cookie
      document.cookie = "user_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      router.push('/login');
    } catch (error) {
      console.error('登出错误:', error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">加载中...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>仪表盘 - CRM系统</title>
      </Head>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <h1 className="text-lg font-bold">CRM系统</h1>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-700 mr-4">
                  {user?.name || '用户'}
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded text-sm"
                >
                  退出登录
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="py-10">
          <header>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h1 className="text-3xl font-bold leading-tight text-gray-900">
                仪表盘
              </h1>
            </div>
          </header>
          <main>
            <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
              <div className="px-4 py-8 sm:px-0">
                <div className="bg-white overflow-hidden shadow rounded-lg p-6">
                  <h2 className="text-lg font-semibold mb-4">
                    欢迎回来，{user?.name || '用户'}！
                  </h2>
                  <p className="text-gray-600">您已成功登录CRM系统。</p>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                          <svg
                            className="h-6 w-6 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              客户总数
                            </dt>
                            <dd>
                              <div className="text-lg font-medium text-gray-900">
                                1,234
                              </div>
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                          <svg
                            className="h-6 w-6 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              本月新增
                            </dt>
                            <dd>
                              <div className="text-lg font-medium text-gray-900">
                                56
                              </div>
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                          <svg
                            className="h-6 w-6 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                            />
                          </svg>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              待处理任务
                            </dt>
                            <dd>
                              <div className="text-lg font-medium text-gray-900">
                                28
                              </div>
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                          <svg
                            className="h-6 w-6 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              本月销售额
                            </dt>
                            <dd>
                              <div className="text-lg font-medium text-gray-900">
                                ¥89,562
                              </div>
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
EOF

# 修复主页重定向
echo "修复主页重定向..."
cat > pages/index.tsx << 'EOF'
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // 检查登录状态
    const isLoggedIn = document.cookie.includes('user_logged_in=true');
    console.log('首页检查登录状态:', isLoggedIn);
    
    // 根据登录状态重定向
    if (isLoggedIn) {
      console.log('用户已登录，重定向到仪表盘...');
      router.push('/dashboard');
    } else {
      console.log('用户未登录，重定向到登录页...');
      router.push('/login');
    }
  }, [router]);

  return (
    <>
      <Head>
        <title>CRM系统</title>
        <meta name="description" content="客户关系管理系统" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">正在重定向...</p>
      </div>
    </>
  );
}
EOF

# 重新构建项目
echo "重新构建项目..."
npm run build

# 重启应用
echo "重启应用..."
pm2 restart sncrm

echo "修复完成。"
EOT

echo "登录重定向问题修复脚本已运行。"
echo "请访问 http://crm.xinghun.info 测试登录功能。" 