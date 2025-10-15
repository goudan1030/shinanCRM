#!/bin/bash

# 登录重定向问题综合修复脚本
echo "======================================"
echo "CRM系统登录重定向问题修复脚本"
echo "======================================"

# 检查是否有root权限
if [ "$(id -u)" != "0" ]; then
   echo "此脚本需要root权限，请使用sudo运行" 
   exit 1
fi

# 定义工作目录
CRM_DIR="/www/wwwroot/sncrm"

# 步骤1: 创建备份
echo "[步骤1] 创建系统备份..."
BACKUP_DIR="${CRM_DIR}/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# 备份关键文件
if [ -f "${CRM_DIR}/src/components/login-form.tsx" ]; then
  cp "${CRM_DIR}/src/components/login-form.tsx" "${BACKUP_DIR}/login-form.tsx.bak"
fi

if [ -f "${CRM_DIR}/src/app/(auth)/login/page.tsx" ]; then
  cp "${CRM_DIR}/src/app/(auth)/login/page.tsx" "${BACKUP_DIR}/login-page.tsx.bak"
fi

if [ -f "${CRM_DIR}/src/contexts/auth-context.tsx" ]; then
  cp "${CRM_DIR}/src/contexts/auth-context.tsx" "${BACKUP_DIR}/auth-context.tsx.bak"
fi

echo "系统备份已创建在 ${BACKUP_DIR}"

# 步骤2: 检查和修复环境变量
echo "[步骤2] 检查环境变量..."
if [ ! -f "${CRM_DIR}/.env" ]; then
  echo "创建.env文件..."
  cat > "${CRM_DIR}/.env" << 'EOL'
# 数据库配置
DB_HOST=121.41.65.220
DB_PORT=3306
DB_USER=h5_cloud_user
DB_PASSWORD=mc72TNcMmy6HCybH
DB_NAME=h5_cloud_db

# 认证配置
JWT_SECRET=sn8we6nRudHjsDnso7h3Qzpr5Pax8Jwe
NEXTAUTH_URL=http://crm.xinghun.info
NEXTAUTH_SECRET=sn8we6nRudHjsDnso7h3Qzpr5Pax8Jwe

# 服务器配置
SERVER_URL=http://121.41.65.220:8888/
NODE_ENV=production
HOST=0.0.0.0
PORT=3001
EOL
  echo ".env文件已创建"
else
  echo ".env文件已存在，检查内容..."
  # 确保NEXTAUTH_URL设置正确
  if ! grep -q "NEXTAUTH_URL=http://crm.xinghun.info" "${CRM_DIR}/.env"; then
    echo "更新NEXTAUTH_URL..."
    sed -i 's|NEXTAUTH_URL=.*|NEXTAUTH_URL=http://crm.xinghun.info|g' "${CRM_DIR}/.env"
  fi
fi

# 步骤3: 修复登录表单组件
echo "[步骤3] 修复登录表单组件..."
cat > "${CRM_DIR}/src/components/login-form.tsx" << 'EOL'
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
      if (typeof window !== 'undefined') {
        console.log('执行页面重定向...');
        // 使用显式的URL包含timestamp参数，避免缓存
        const timestamp = new Date().getTime();
        window.location.href = `/dashboard?t=${timestamp}`;
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

# 步骤4: 修复Nginx配置
echo "[步骤4] 修复Nginx配置..."
cat > /www/server/panel/vhost/nginx/crm.xinghun.info.conf << 'EOL'
server {
    listen 80;
    server_name crm.xinghun.info;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 设置不缓存，强制刷新会话
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
        
        # 增加缓冲区大小，解决大请求的问题
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
        
        # 增加连接超时时间
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
    }

    # 正确映射静态资源
    location /_next/static/ {
        alias /www/wwwroot/sncrm/.next/static/;
        expires 30d;
        access_log off;
    }

    # 正确映射public目录
    location /public/ {
        alias /www/wwwroot/sncrm/public/;
        expires 30d;
        access_log off;
    }
}
EOL

# 重启Nginx
echo "重启Nginx服务..."
/etc/init.d/nginx reload

# 步骤5: 创建修复主机名的脚本
echo "[步骤5] 修复主机名解析..."
if ! grep -q "127.0.0.1 iZbp18aua0oiex6942sg6vZ" /etc/hosts; then
  echo "127.0.0.1 iZbp18aua0oiex6942sg6vZ" >> /etc/hosts
  echo "主机名映射已添加"
fi

# 步骤6: 创建会话重置工具
echo "[步骤6] 创建会话重置工具..."
cat > "${CRM_DIR}/public/reset-session.html" << 'EOL'
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>会话重置工具</title>
  <style>
    body {
      font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
    }
    h1 {
      color: #333;
      text-align: center;
    }
    .button {
      display: block;
      width: 100%;
      padding: 12px;
      background-color: #1677ff;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      cursor: pointer;
      text-align: center;
      margin: 20px 0;
      text-decoration: none;
    }
    .button:hover {
      background-color: #0958d9;
    }
    .steps {
      background-color: #f5f5f5;
      padding: 15px;
      border-radius: 4px;
      margin-top: 20px;
    }
    .debug {
      margin-top: 30px;
      border-top: 1px solid #eee;
      padding-top: 20px;
    }
    .debug-button {
      background-color: #f0f0f0;
      color: #333;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <h1>CRM系统会话重置工具</h1>
  
  <p>如果您在登录后仍然停留在登录页面，或遇到其他会话相关问题，请使用此工具重置您的会话。</p>
  
  <a href="/api/auth/logout" class="button">清除会话并重新登录</a>
  
  <div class="steps">
    <h3>解决步骤:</h3>
    <ol>
      <li>点击上面的按钮清除会话</li>
      <li>系统会自动将您重定向到登录页</li>
      <li>使用您的账号密码重新登录</li>
      <li>登录成功后，系统应该正确将您重定向到仪表板</li>
    </ol>
  </div>
  
  <p>如果问题仍然存在，请尝试:</p>
  <ol>
    <li>清除浏览器缓存和Cookie</li>
    <li>使用不同的浏览器</li>
    <li>联系系统管理员获取帮助</li>
  </ol>
  
  <div class="debug">
    <h3>高级调试工具</h3>
    <p>以下工具可以帮助管理员诊断问题：</p>
    <button onclick="clearAllCookies()" class="button debug-button">清除所有Cookie</button>
    <button onclick="showCookies()" class="button debug-button">显示当前Cookie</button>
    <button onclick="forceRedirect()" class="button debug-button">强制重定向到仪表板</button>
    
    <div id="cookie-info" style="margin-top: 15px; font-size: 12px;"></div>
    
    <script>
      function clearAllCookies() {
        const cookies = document.cookie.split(";");
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i];
          const eqPos = cookie.indexOf("=");
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        }
        alert('所有Cookie已清除，请刷新页面');
        setTimeout(() => window.location.reload(), 1000);
      }
      
      function showCookies() {
        const cookieInfo = document.getElementById('cookie-info');
        cookieInfo.innerHTML = '<h4>当前Cookie:</h4>';
        
        if (document.cookie) {
          const cookies = document.cookie.split(';');
          const list = document.createElement('ul');
          
          cookies.forEach(cookie => {
            const item = document.createElement('li');
            item.textContent = cookie.trim();
            list.appendChild(item);
          });
          
          cookieInfo.appendChild(list);
        } else {
          cookieInfo.innerHTML += '<p>没有Cookie</p>';
        }
      }
      
      function forceRedirect() {
        if (confirm('确定要强制重定向到仪表板吗？')) {
          window.location.href = '/dashboard?force=true&t=' + new Date().getTime();
        }
      }
    </script>
  </div>
</body>
</html>
EOL

# 步骤7: 重新编译和启动应用
echo "[步骤7] 重新编译和启动应用..."
cd "${CRM_DIR}"

# 停止当前运行的应用
echo "停止当前应用..."
pm2 stop sncrm || true
pm2 delete sncrm || true

# 重新编译应用
echo "重新编译应用..."
npm run build

# 确保_next符号链接存在
echo "确保静态资源链接正确..."
cd "${CRM_DIR}"
if [ ! -L "_next" ]; then
  ln -sf .next _next
fi

# 使用正确的方式启动应用
echo "使用正确的方式启动应用..."
NODE_ENV=production PORT=3001 pm2 start .next/standalone/server.js --name sncrm

echo "======================================"
echo "修复完成! 请按以下步骤操作:"
echo "1. 访问 http://crm.xinghun.info/reset-session.html"
echo "2. 点击'清除会话并重新登录'按钮"
echo "3. 使用您的账号和密码重新登录"
echo "4. 登录后应该会正确重定向到仪表板"
echo "======================================" 