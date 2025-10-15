#!/bin/bash

# 设置变量
SERVER_IP="121.41.65.220"
SERVER_USER="root"

echo "开始诊断Next.js Cookie问题..."

# 远程执行命令
ssh $SERVER_USER@$SERVER_IP << 'EOT'
# 进入项目目录
cd /www/wwwroot/sncrm

# 创建诊断工具
echo "创建Cookie诊断工具..."
mkdir -p pages/api/debug
cat > pages/api/debug/cookies.ts << 'EOF'
import type { NextApiRequest, NextApiResponse } from 'next';
import { setCookie } from 'cookies-next';

type DebugResponse = {
  cookies: Record<string, string>;
  headers: Record<string, string | string[]>;
  testCookie: boolean;
};

export default function handler(req: NextApiRequest, res: NextApiResponse<DebugResponse>) {
  // 设置一个测试Cookie
  setCookie('debug_cookie', 'test_value', { 
    req, 
    res, 
    maxAge: 60 * 60 * 24, // 1天
    path: '/', 
    sameSite: 'lax'
  });
  
  // 显式添加Set-Cookie头
  res.setHeader('Set-Cookie', `debug_cookie_header=test_value; Path=/; Max-Age=${60 * 60 * 24}; SameSite=Lax`);
  
  // 提取并返回当前所有Cookie
  const cookies = req.cookies || {};
  
  // 获取请求头
  const headers: Record<string, string | string[]> = {};
  Object.keys(req.headers).forEach(key => {
    headers[key] = req.headers[key] || '';
  });
  
  // 检查debug_cookie是否已经设置
  const testCookie = !!cookies['debug_cookie'];
  
  // 添加诊断信息响应头
  res.setHeader('X-Debug-Info', 'Cookie Diagnostics API');
  
  res.status(200).json({
    cookies,
    headers,
    testCookie
  });
}
EOF

# 创建Cookie诊断页面
echo "创建Cookie诊断页面..."
cat > pages/cookie-debug.tsx << 'EOF'
import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function CookieDebug() {
  const [cookieData, setCookieData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clientCookies, setClientCookies] = useState<string>('');
  const [testResult, setTestResult] = useState<string>('');

  // 获取调试数据
  useEffect(() => {
    async function fetchDebugData() {
      try {
        const res = await fetch('/api/debug/cookies');
        const data = await res.json();
        setCookieData(data);
        setClientCookies(document.cookie);
        
        // 测试cookie设置
        const hasDebugCookie = document.cookie.includes('debug_cookie');
        const hasDebugCookieHeader = document.cookie.includes('debug_cookie_header');
        
        if (hasDebugCookie && hasDebugCookieHeader) {
          setTestResult('成功：两个测试Cookie都已设置！');
        } else if (hasDebugCookie) {
          setTestResult('部分成功：仅设置了debug_cookie');
        } else if (hasDebugCookieHeader) {
          setTestResult('部分成功：仅设置了debug_cookie_header');
        } else {
          setTestResult('失败：两个测试Cookie都未设置！');
        }
      } catch (error) {
        console.error('获取调试数据失败:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDebugData();
  }, []);

  // 手动设置测试Cookie
  const setTestCookie = () => {
    document.cookie = "manual_test_cookie=test_value; path=/; max-age=86400";
    setClientCookies(document.cookie);
  };

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
        <title>Cookie调试 - CRM系统</title>
      </Head>
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-5xl mx-auto bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-6">Cookie调试工具</h1>
          
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-2">测试结果</h2>
            <div className={`p-4 rounded-md ${testResult.includes('成功：两个') ? 'bg-green-100' : testResult.includes('部分成功') ? 'bg-yellow-100' : 'bg-red-100'}`}>
              {testResult}
            </div>
            <button
              onClick={setTestCookie}
              className="mt-3 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
            >
              手动设置测试Cookie
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">客户端Cookie</h2>
              <div className="p-4 bg-gray-100 rounded-md overflow-auto max-h-60">
                <pre className="whitespace-pre-wrap">{clientCookies || '无客户端Cookie'}</pre>
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-2">服务器检测到的Cookie</h2>
              <div className="p-4 bg-gray-100 rounded-md overflow-auto max-h-60">
                <pre className="whitespace-pre-wrap">
                  {cookieData?.cookies ? JSON.stringify(cookieData.cookies, null, 2) : '无Cookie'}
                </pre>
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2">请求头</h2>
            <div className="p-4 bg-gray-100 rounded-md overflow-auto max-h-60">
              <pre className="whitespace-pre-wrap">
                {cookieData?.headers ? JSON.stringify(cookieData.headers, null, 2) : '无请求头'}
              </pre>
            </div>
          </div>
          
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2">诊断信息</h2>
            <ul className="list-disc list-inside">
              <li><strong>浏览器:</strong> {typeof window !== 'undefined' && window.navigator.userAgent}</li>
              <li><strong>API测试Cookie状态:</strong> {cookieData?.testCookie ? '已设置' : '未设置'}</li>
              <li><strong>安全上下文:</strong> {typeof window !== 'undefined' && window.isSecureContext ? '是' : '否'}</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
EOF

# 修复登录API中的Cookie设置
echo "更新登录API的Cookie设置..."
mkdir -p pages/api/auth
cat > pages/api/auth/login.ts << 'EOF'
import type { NextApiRequest, NextApiResponse } from 'next';
import { setCookie } from 'cookies-next';
import { AuthResponse } from '../../../types';

export default function handler(req: NextApiRequest, res: NextApiResponse<AuthResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: '请提供邮箱和密码' });
    }

    // 创建认证令牌
    const token = `auth-token-${Date.now()}`;
    
    // 设置多种Cookie以确保至少一种能工作
    
    // 方法1: 使用cookies-next库
    setCookie('auth_token', token, { 
      req, 
      res, 
      maxAge: 60 * 60 * 24 * 7, // 7天
      path: '/',
      httpOnly: true,
      sameSite: 'lax'
    });
    
    setCookie('user_logged_in', 'true', { 
      req, 
      res, 
      maxAge: 60 * 60 * 24 * 7, // 7天
      path: '/',
      sameSite: 'lax'
    });

    // 方法2: 使用直接设置响应头
    res.setHeader('Set-Cookie', [
      `auth_token_direct=${token}; Path=/; Max-Age=${60 * 60 * 24 * 7}; HttpOnly; SameSite=Lax`,
      `user_logged_in_direct=true; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`
    ]);

    // 记录信息以帮助调试
    console.log('登录成功，设置Cookie:', {
      auth_token: token,
      user_logged_in: true,
      headers: res.getHeader('Set-Cookie')
    });

    return res.status(200).json({ 
      success: true, 
      message: '登录成功，设置了多种Cookie方案，请查看cookie-debug页面',
      redirectUrl: '/dashboard' 
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: '登录失败，请稍后再试' });
  }
}
EOF

# 更新首页以添加诊断链接
echo "更新首页以添加诊断链接..."
cat > pages/index.tsx << 'EOF'
import { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function Home() {
  useEffect(() => {
    // 检查登录状态
    const isLoggedIn = document.cookie.includes('user_logged_in') || 
                       document.cookie.includes('user_logged_in_direct');
    console.log('首页检查登录状态:', isLoggedIn);
    console.log('所有Cookie:', document.cookie);
    
    // 由于Cookie可能有问题，我们允许手动导航而不是自动重定向
  }, []);

  return (
    <>
      <Head>
        <title>CRM系统</title>
        <meta name="description" content="客户关系管理系统" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-3xl font-bold mb-8">CRM系统</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">导航</h2>
            <div className="space-y-3">
              <Link href="/login" className="block w-full bg-blue-500 hover:bg-blue-600 text-white text-center py-2 px-4 rounded">
                登录页面
              </Link>
              <Link href="/dashboard" className="block w-full bg-green-500 hover:bg-green-600 text-white text-center py-2 px-4 rounded">
                仪表盘
              </Link>
            </div>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-2">诊断工具</h2>
            <div className="space-y-3">
              <Link href="/cookie-debug" className="block w-full bg-purple-500 hover:bg-purple-600 text-white text-center py-2 px-4 rounded">
                Cookie诊断
              </Link>
              <Link href="/static-test.html" className="block w-full bg-yellow-500 hover:bg-yellow-600 text-white text-center py-2 px-4 rounded">
                静态资源测试
              </Link>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-sm text-gray-500">
          <p>如遇到问题，请先使用Cookie诊断工具检查Cookie设置是否正常。</p>
        </div>
      </div>
    </>
  );
}
EOF

# 创建帮助脚本，用于在浏览器控制台中设置Cookie
echo "创建帮助脚本..."
cat > public/set-cookies.js << 'EOF'
// 在浏览器控制台中运行这个脚本以手动设置Cookie
function setCookies() {
  document.cookie = "user_logged_in=true; path=/; max-age=604800";
  document.cookie = "auth_token=manual-token-" + Date.now() + "; path=/; max-age=604800";
  console.log("已设置以下Cookie:");
  console.log("user_logged_in=true");
  console.log("auth_token=manual-token-" + Date.now());
  console.log("所有Cookie:", document.cookie);
  return "Cookie设置成功，请刷新页面";
}

console.log("请在控制台中运行 setCookies() 来手动设置登录Cookie");
EOF

# 重新构建和启动应用
echo "重新构建和启动应用..."
npm run build
pm2 restart sncrm

echo "Cookie诊断工具已创建，请访问以下URL测试:"
echo "- http://crm.xinghun.info/cookie-debug - Cookie诊断工具"
echo "- http://crm.xinghun.info - 已更新的首页"
EOT

echo "Next.js Cookie诊断脚本已运行。"
echo "请访问 http://crm.xinghun.info/cookie-debug 检查Cookie设置情况。" 