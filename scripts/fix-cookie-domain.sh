#!/bin/bash

# 设置变量
SERVER_IP="121.41.65.220"
SERVER_USER="root"

echo "正在修复Cookie域名问题..."

# 远程执行命令
ssh $SERVER_USER@$SERVER_IP << 'EOT'
# 进入项目目录
cd /www/wwwroot/sncrm

# 更新登录API - 修复Cookie设置
echo "更新登录API，修复Cookie设置..."
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

# 更新登录页面 - 增强前端重定向
echo "更新登录页面，增强前端重定向..."
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
          router.push('/dashboard');
          return;
        }
        
        // 如果没有Cookie，尝试检查会话API
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        
        setDebugInfo(prev => prev + `\n会话API响应: ${JSON.stringify(data)}`);
        
        if (data.authenticated && data.user) {
          setDebugInfo(prev => prev + '\n会话API显示已认证，准备跳转到仪表盘...');
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('检查会话失败:', error);
        setDebugInfo(prev => prev + `\n检查会话出错: ${error}`);
      }
    };
    
    checkSession();
  }, [router]);

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
          
          // 确保跳转发生
          if (data.redirectUrl) {
            setDebugInfo(prev => prev + `\n使用API返回的URL跳转: ${data.redirectUrl}`);
            router.push(data.redirectUrl);
          } else {
            setDebugInfo(prev => prev + '\n使用默认URL跳转: /dashboard');
            router.push('/dashboard');
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

# 重新构建项目
echo "重新构建项目..."
npm run build

# 重启应用
echo "重启应用..."
pm2 restart sncrm

echo "Cookie域名问题修复完成。"
EOT

echo "Cookie域名问题修复脚本已运行。"
echo "请访问 http://crm.xinghun.info 测试登录功能。" 