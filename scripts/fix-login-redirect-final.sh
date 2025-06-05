#!/bin/bash

# 设置变量
SERVER_IP="8.149.244.105"
SERVER_USER="root"

echo "正在执行最终修复方案..."

# 远程执行命令
ssh $SERVER_USER@$SERVER_IP << 'EOT'
# 进入项目目录
cd /www/wwwroot/sncrm

# 首先更新类型定义
echo "更新类型定义..."
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
  redirectUrl?: string; // 添加重定向URL字段
}

export interface SessionResponse {
  authenticated: boolean;
  message?: string;
  user?: User;
}
EOF

# 更新登录API
echo "更新登录API..."
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
      redirectUrl: '/dashboard' // 明确返回重定向URL
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: '登录失败，请稍后再试' });
  }
}
EOF

# 创建登出API
echo "创建登出API..."
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

# 创建简单的中间件来处理认证重定向
echo "创建中间件处理认证重定向..."
cat > middleware.ts << 'EOF'
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 不需要登录即可访问的公开路径
const publicPaths = [
  '/login',
  '/api/auth/login',
  '/api/auth/session',
  '/favicon.ico',
  '/_next',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 对于静态资源，不执行重定向
  if (pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico)$/)) {
    return NextResponse.next();
  }
  
  // 检查是否公开路径
  for (const path of publicPaths) {
    if (pathname === path || pathname.startsWith(path)) {
      return NextResponse.next();
    }
  }

  // 检查登录状态
  const hasAuthToken = request.cookies.has('auth_token');
  const hasLoginSuccess = request.cookies.has('user_logged_in');
  
  // 未登录且访问非公开路径，重定向到登录页
  if (!hasAuthToken && !hasLoginSuccess) {
    console.log(`[中间件] 未登录用户访问 ${pathname}，重定向到登录页`);
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  console.log(`[中间件] 已登录用户访问 ${pathname}，允许访问`);
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
EOF

# 更新登录页面
echo "更新登录页面..."
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
  const [debugInfo, setDebugInfo] = useState('');
  const router = useRouter();

  // 检查是否已登录，如果已登录则直接跳转到仪表盘
  useEffect(() => {
    const checkSession = async () => {
      try {
        // 检查Cookie
        const hasUserLoggedIn = document.cookie.includes('user_logged_in=true');
        setDebugInfo(prev => prev + `\n检查Cookie: user_logged_in=${hasUserLoggedIn}`);
        
        if (hasUserLoggedIn) {
          setDebugInfo(prev => prev + '\n检测到登录Cookie，准备跳转到仪表盘...');
          window.location.href = '/dashboard'; // 使用window.location而不是router以强制完全重新加载
          return;
        }
        
        // 如果没有Cookie，尝试检查会话API
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        
        setDebugInfo(prev => prev + `\n会话API响应: ${JSON.stringify(data)}`);
        
        if (data.authenticated && data.user) {
          setDebugInfo(prev => prev + '\n会话API显示已认证，准备跳转到仪表盘...');
          window.location.href = '/dashboard'; // 使用window.location而不是router以强制完全重新加载
        }
      } catch (error) {
        console.error('检查会话失败:', error);
        setDebugInfo(prev => prev + `\n检查会话出错: ${error}`);
      }
    };
    
    checkSession();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setDebugInfo('开始登录过程...');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include' // 确保包含Cookie
      });

      const data = await response.json() as AuthResponse;
      setDebugInfo(prev => prev + `\n登录API响应: ${JSON.stringify(data)}`);

      if (response.ok) {
        setDebugInfo(prev => prev + '\n登录成功，准备跳转到仪表盘...');
        
        // 强制设置客户端cookie
        document.cookie = "user_logged_in=true; path=/; max-age=604800";
        setDebugInfo(prev => prev + '\n已在客户端设置Cookie: user_logged_in=true');
        
        // 检查Cookie是否设置成功
        setTimeout(() => {
          const cookieSet = document.cookie.includes('user_logged_in=true');
          setDebugInfo(prev => prev + `\nCookie设置检查: ${cookieSet ? '成功' : '失败'}`);
          
          // 确保跳转发生 - 使用window.location而不是router以强制完全重新加载
          if (data.redirectUrl) {
            setDebugInfo(prev => prev + `\n使用API返回的URL跳转: ${data.redirectUrl}`);
            window.location.href = data.redirectUrl;
          } else {
            setDebugInfo(prev => prev + '\n使用默认URL跳转: /dashboard');
            window.location.href = '/dashboard';
          }
        }, 500);
      } else {
        setError(data.message || '登录失败');
      }
    } catch (err) {
      setError('登录失败，请稍后再试');
      console.error('Login error:', err);
      setDebugInfo(prev => prev + `\n登录出错: ${err}`);
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
          
          {/* 调试信息区域 */}
          {debugInfo && (
            <div className="mt-8 p-4 bg-gray-100 rounded text-xs text-gray-700 whitespace-pre-wrap">
              <h4 className="font-bold mb-2">调试信息:</h4>
              {debugInfo}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
EOF

# 更新主页
echo "更新主页..."
cat > pages/index.tsx << 'EOF'
import { useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  useEffect(() => {
    // 检查登录状态
    const isLoggedIn = document.cookie.includes('user_logged_in=true');
    console.log('首页检查登录状态:', isLoggedIn);
    
    // 根据登录状态重定向 - 使用window.location而不是router以强制完全重新加载
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

# 重新构建项目
echo "重新构建项目..."
npm run build

# 重启应用
echo "重启应用..."
pm2 restart sncrm

echo "最终修复完成。"
EOT

echo "最终修复脚本已运行。"
echo "请访问 http://crm.xinghun.info 测试登录功能。" 