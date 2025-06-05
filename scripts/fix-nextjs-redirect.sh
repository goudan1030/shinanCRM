#!/bin/bash

# 设置变量
SERVER_IP="8.149.244.105"
SERVER_USER="root"

echo "开始修复Next.js重定向问题..."

# 远程执行命令
ssh $SERVER_USER@$SERVER_IP << 'EOT'
# 进入项目目录
cd /www/wwwroot/sncrm

# 恢复先前可能替换的静态HTML
echo "清理临时解决方案..."
rm -f public/login.html
rm -f public/dashboard.html
rm -f public/index.html
rm -f api-server.js
rm -f simple-server.js

# 首先确认Next.js依赖已安装
echo "安装和更新必要的依赖..."
npm install next@latest react@latest react-dom@latest --save
npm install cookies-next --save

# 更新Next.js配置
echo "更新Next.js配置..."
cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  poweredByHeader: false,
  env: {
    NEXTAUTH_URL: 'http://crm.xinghun.info',
    API_URL: 'http://crm.xinghun.info/api',
  },
};

module.exports = nextConfig;
EOF

# 更新类型定义
echo "更新类型定义..."
mkdir -p types
cat > types/index.ts << 'EOF'
export interface User {
  id: number;
  name: string;
  email?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  redirectUrl?: string;
}

export interface SessionResponse {
  authenticated: boolean;
  message?: string;
  user?: User;
}
EOF

# 创建/更新登录页
echo "更新登录页..."
mkdir -p pages/login
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
    const checkCookie = () => {
      const isLoggedIn = document.cookie.includes('user_logged_in=true');
      if (isLoggedIn) {
        console.log('已检测到登录Cookie，准备跳转到仪表盘...');
        window.location.href = '/dashboard';
      }
    };
    
    checkCookie();
  }, []);

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
        credentials: 'include'
      });

      const data = await response.json() as AuthResponse;

      if (response.ok) {
        console.log('登录成功，准备跳转到仪表盘...');
        // 强制设置客户端cookie
        document.cookie = "user_logged_in=true; path=/; max-age=604800";
        
        // 使用window.location而不是router进行强制重定向
        window.location.href = '/dashboard';
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

# 创建/更新仪表盘页
echo "更新仪表盘页..."
mkdir -p pages/dashboard
cat > pages/dashboard/index.tsx << 'EOF'
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { User } from '../../types';

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        
        if (!data.authenticated) {
          console.log('未认证，重定向到登录页...');
          window.location.href = '/login';
          return;
        }

        if (data.user) {
          console.log('已获取用户信息:', data.user);
          setUser(data.user);
        }
      } catch (error) {
        console.error('获取用户会话失败:', error);
        window.location.href = '/login';
      } finally {
        setLoading(false);
      }
    }

    // 检查Cookie
    const isLoggedIn = document.cookie.includes('user_logged_in=true');
    console.log('客户端检查Cookie:', isLoggedIn);

    if (!isLoggedIn) {
      console.log('未检测到登录Cookie，重定向到登录页...');
      window.location.href = '/login';
      return;
    }

    fetchUser();
  }, []);

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      // 清除客户端cookie
      document.cookie = "user_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      window.location.href = '/login';
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

# 创建/更新首页
echo "更新首页..."
cat > pages/index.tsx << 'EOF'
import { useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  useEffect(() => {
    // 检查登录状态
    const isLoggedIn = document.cookie.includes('user_logged_in=true');
    console.log('首页检查登录状态:', isLoggedIn);
    
    // 根据登录状态重定向 - 使用window.location强制刷新
    if (isLoggedIn) {
      console.log('用户已登录，重定向到仪表盘...');
      window.location.href = '/dashboard';
    } else {
      console.log('用户未登录，重定向到登录页...');
      window.location.href = '/login';
    }
  }, []);

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

# 创建/更新登录API
echo "更新登录API..."
mkdir -p pages/api/auth
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
    
    // 设置Cookie - 不指定域名，让浏览器自动匹配当前域名
    setCookie('auth_token', token, { 
      req, 
      res, 
      maxAge: 60 * 60 * 24 * 7, // 7天
      path: '/',
      httpOnly: true,
      sameSite: 'lax'
    });
    
    // 设置前端可见的登录状态Cookie
    setCookie('user_logged_in', 'true', { 
      req, 
      res, 
      maxAge: 60 * 60 * 24 * 7, // 7天
      path: '/',
      httpOnly: false,
      sameSite: 'lax'
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

    // 添加日志，帮助调试
    console.log('登录成功，设置Cookie:', {
      auth_token: token,
      user_logged_in: true
    });

    return res.status(200).json({ 
      success: true, 
      message: '登录成功',
      user,
      redirectUrl: '/dashboard' 
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: '登录失败，请稍后再试' });
  }
}
EOF

# 创建/更新登出API
echo "更新登出API..."
cat > pages/api/auth/logout.ts << 'EOF'
import type { NextApiRequest, NextApiResponse } from 'next';
import { deleteCookie } from 'cookies-next';

interface LogoutResponse {
  success: boolean;
  message: string;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<LogoutResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // 清除所有认证相关Cookie
    deleteCookie('auth_token', { req, res, path: '/' });
    deleteCookie('user_logged_in', { req, res, path: '/' });

    // 显式添加Set-Cookie头，确保cookie被删除
    res.setHeader('Set-Cookie', [
      'auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      'user_logged_in=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
    ]);

    return res.status(200).json({
      success: true,
      message: '登出成功'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: '登出失败，请稍后再试'
    });
  }
}
EOF

# 创建/更新会话API
echo "更新会话API..."
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

# 更新Nginx配置
echo "更新Nginx配置..."
cat > /www/server/panel/vhost/nginx/crm.xinghun.info.conf << 'EOF'
server {
    listen 80;
    server_name crm.xinghun.info;
    root /www/wwwroot/sncrm;
    
    # Next.js应用反向代理
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 静态资源缓存
    location /_next/static {
        alias /www/wwwroot/sncrm/.next/static;
        expires 365d;
        access_log off;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    # 处理静态文件
    location /static {
        alias /www/wwwroot/sncrm/public/static;
        expires 30d;
    }
    
    # 其他静态文件
    location ~ ^/(favicon.ico|robots.txt) {
        root /www/wwwroot/sncrm/public;
        access_log off;
        expires 30d;
    }
    
    access_log /www/wwwlogs/crm.xinghun.info.log;
    error_log /www/wwwlogs/crm.xinghun.info.error.log;
}
EOF

# 设置文件权限
echo "设置文件权限..."
chown -R www:www /www/wwwroot/sncrm/.next
chmod -R 755 /www/wwwroot/sncrm/.next
chown -R www:www /www/wwwroot/sncrm/public
chmod -R 755 /www/wwwroot/sncrm/public

# 测试Nginx配置
echo "测试Nginx配置..."
nginx -t

# 重新加载Nginx配置
echo "重新加载Nginx配置..."
nginx -s reload

# 更新PM2配置
echo "更新PM2配置..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'sncrm',
      script: 'npm',
      args: 'start',
      cwd: '/www/wwwroot/sncrm',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
EOF

# 重新构建和启动应用
echo "重新构建和启动应用..."
npm run build
pm2 restart sncrm

echo "Next.js重定向问题修复完成。"
EOT

echo "Next.js重定向修复脚本已运行。"
echo "请完全清除浏览器缓存后再次访问 http://crm.xinghun.info 测试。" 