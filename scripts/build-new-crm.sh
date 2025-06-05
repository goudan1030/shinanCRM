#!/bin/bash

# 从头构建新CRM系统的脚本
echo "开始从头构建新CRM系统..."

# 设置变量
SERVER_IP="8.149.244.105"
SERVER_USER="root"

# 远程执行命令
ssh $SERVER_USER@$SERVER_IP << 'EOT'
# 设置工作目录
WORK_DIR="/www/wwwroot/sncrm_new"
mkdir -p $WORK_DIR
cd $WORK_DIR

echo "创建全新的Next.js应用..."
# 确保有Node.js环境
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 16 || nvm install 16

# 使用npx创建新的Next.js应用
echo "初始化新的Next.js应用..."
npx create-next-app@latest . --typescript --eslint --use-npm --no-app --no-src-dir --import-alias="@/*" --yes

# 创建基本的CRM功能
echo "创建基本的CRM功能..."

# 修改package.json以使用正确的端口
cat > package.json << 'EOF'
{
  "name": "shinan-crm",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.1.0",
    "react": "^18",
    "react-dom": "^18",
    "react-hook-form": "^7.50.0",
    "cookies-next": "^4.1.0",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "@types/jsonwebtoken": "^9.0.5",
    "autoprefixer": "^10.0.1",
    "eslint": "^8",
    "eslint-config-next": "14.1.0",
    "postcss": "^8",
    "tailwindcss": "^3.3.0",
    "typescript": "^5"
  }
}
EOF

# 安装依赖
echo "安装依赖..."
npm install

# 创建登录页面
echo "创建登录页面..."
mkdir -p pages/login
cat > pages/login/index.tsx << 'EOF'
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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

      const data = await response.json();

      if (response.ok) {
        router.push('/dashboard');
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

# 创建仪表盘页面
echo "创建仪表盘页面..."
mkdir -p pages/dashboard
cat > pages/dashboard/index.tsx << 'EOF'
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();

        if (!data.authenticated) {
          router.push('/login');
          return;
        }

        setUser(data.user);
      } catch (error) {
        console.error('Failed to fetch user session:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [router]);

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
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

# 创建API路由
echo "创建API路由..."

# 登录API
mkdir -p pages/api/auth
cat > pages/api/auth/login.ts << 'EOF'
import type { NextApiRequest, NextApiResponse } from 'next';
import { setCookie } from 'cookies-next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    // 在实际应用中，这里应该验证用户凭据
    // 为简化起见，我们允许任何有效的电子邮件和密码登录
    if (!email || !password) {
      return res.status(400).json({ message: '请提供邮箱和密码' });
    }

    // 创建认证令牌
    const token = `auth-token-${Date.now()}`;
    
    // 设置Cookie
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

    return res.status(200).json({ 
      success: true, 
      message: '登录成功',
      user: {
        id: 1,
        name: '管理员',
        email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: '登录失败，请稍后再试' });
  }
}
EOF

# 会话验证API
cat > pages/api/auth/session.ts << 'EOF'
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCookie } from 'cookies-next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const authToken = getCookie('auth_token', { req, res });
    
    if (!authToken) {
      return res.status(401).json({ authenticated: false });
    }
    
    // 在实际应用中，这里应该验证令牌
    return res.status(200).json({
      authenticated: true,
      user: {
        id: 1,
        name: '管理员'
      }
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

# 登出API
cat > pages/api/auth/logout.ts << 'EOF'
import type { NextApiRequest, NextApiResponse } from 'next';
import { setCookie } from 'cookies-next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // 清除认证Cookie
    setCookie('auth_token', '', { 
      req, 
      res, 
      maxAge: 0,
      path: '/',
      httpOnly: true
    });
    
    // 清除前端登录状态Cookie
    setCookie('user_logged_in', '', { 
      req, 
      res, 
      maxAge: 0,
      path: '/',
      httpOnly: false
    });
    
    return res.status(200).json({ success: true, message: '已成功登出' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ message: '登出失败，请稍后再试' });
  }
}
EOF

# 修改主页
cat > pages/index.tsx << 'EOF'
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // 重定向到登录页
    router.push('/login');
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

# 创建中间件
cat > middleware.ts << 'EOF'
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 公开路径
const publicPaths = [
  '/login',
  '/api/auth/login',
  '/_next',
  '/favicon.ico'
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 检查是否是公开路径
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }
  
  // 检查认证状态
  const authToken = request.cookies.get('auth_token');
  
  if (!authToken) {
    // API路由返回401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, message: '未授权访问' },
        { status: 401 }
      );
    }
    
    // 重定向到登录页
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了：
     * - 静态文件 (如 /_next/static/*)
     * - API路由中的登录相关接口
     */
    '/((?!_next/static|_next/image).*)',
  ],
};
EOF

# 创建tailwind配置
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF

# 构建项目
echo "构建项目..."
npm run build

# 设置PM2配置
echo "设置PM2配置..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'sncrm',
      script: 'npm',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
};
EOF

echo "创建迁移脚本..."
cat > deploy.sh << 'EOF'
#!/bin/bash

# 停止当前应用
pm2 stop sncrm

# 备份当前系统
BACKUP_DIR="/www/backup/sncrm-$(date +%Y%m%d%H%M%S)"
mkdir -p $BACKUP_DIR
cp -r /www/wwwroot/sncrm/* $BACKUP_DIR/

# 清空目标目录
rm -rf /www/wwwroot/sncrm/*

# 复制新系统
cp -r /www/wwwroot/sncrm_new/* /www/wwwroot/sncrm/

# 启动新系统
cd /www/wwwroot/sncrm
pm2 start ecosystem.config.js

# 修改Nginx配置
cat > /www/server/panel/vhost/nginx/crm.xinghun.info.conf << 'EOFNGINX'
server {
    listen 80;
    server_name crm.xinghun.info 8.149.244.105;
    
    # 静态资源配置
    location /_next/static/ {
        alias /www/wwwroot/sncrm/.next/static/;
        expires max;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    # 反向代理所有请求
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 禁用代理缓冲，确保实时传递响应头
        proxy_buffering off;
    }
    
    # 日志设置
    access_log /www/wwwlogs/sncrm.access.log;
    error_log /www/wwwlogs/sncrm.error.log;
}
EOFNGINX

# 测试并重启Nginx
nginx -t && /etc/init.d/nginx reload

echo "部署完成。新系统已上线，旧系统已备份。"
EOF

chmod +x deploy.sh

echo "新CRM系统构建完成。"
echo "系统位于: $WORK_DIR"
echo "运行 deploy.sh 脚本可将新系统部署到正式环境。"
EOT

echo "新CRM系统构建完成。"
echo "请连接到服务器并运行 /www/wwwroot/sncrm_new/deploy.sh 进行部署。" 