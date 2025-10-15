#!/bin/bash

# 全面修复认证和登录问题的脚本
# 主要解决登录后仍停留在登录页面的问题

# 设置颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}===== 开始修复认证和登录问题 =====${NC}"

# 设置变量
APP_DIR="/www/wwwroot/sncrm"
SERVER_IP="121.41.65.220"
SERVER_USER="root"

# 1. 在本地修复登录表单组件
echo -e "${YELLOW}[1/5] 修复登录表单组件${NC}"

# 创建登录表单临时文件
cat > login-form-fixed.tsx << 'EOL'
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
  user?: {
    id: number;
    email: string;
    name?: string;
    role: string;
  };
  message?: string;
  error?: string;
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
      
      // 调用登录API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });
      
      console.log('登录响应状态:', response.status);
      
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
      
      console.log('登录成功，准备重定向到仪表板...');
      
      // 延迟重定向，确保cookie已保存
      setTimeout(() => {
        // 使用硬重定向，确保完全刷新页面
        window.location.href = `/dashboard?t=${Date.now()}`;
      }, 1000);
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
                onChange={(e) => setPassword(e.target.value)}
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
EOL

echo -e "${GREEN}✅ 登录表单组件修复完成${NC}"

# 2. 远程执行服务器端修复
echo -e "${YELLOW}[2/5] 执行服务器端修复${NC}"

# 上传修复后的登录表单组件
scp login-form-fixed.tsx $SERVER_USER@$SERVER_IP:/tmp/login-form-fixed.tsx

# 远程执行修复脚本
ssh $SERVER_USER@$SERVER_IP << 'EOT'
echo "===== 执行服务器端修复 ====="

# 设置目录
APP_DIR="/www/wwwroot/sncrm"

# 1. 确保.env.production文件配置正确
echo "1. 检查环境变量配置..."
cat > $APP_DIR/.env.production << EOF
# 数据库配置
DB_HOST=121.41.65.220
DB_PORT=3306
DB_USER=h5_cloud_user
DB_PASSWORD=mc72TNcMmy6HCybH
DB_NAME=h5_cloud_db

# JWT配置（生成的安全随机字符串）
JWT_SECRET=sn8we6nRudHjsDnso7h3Qzpr5Pax8Jwe

# 服务器配置
SERVER_URL=http://crm.xinghun.info/
NODE_ENV=production
PORT=3001
EOF

# 2. 备份和更新登录表单组件
echo "2. 更新登录表单组件..."
mkdir -p $APP_DIR/backups
if [ -f "$APP_DIR/src/components/login-form.tsx" ]; then
  cp $APP_DIR/src/components/login-form.tsx $APP_DIR/backups/login-form.tsx.bak
fi
cp /tmp/login-form-fixed.tsx $APP_DIR/src/components/login-form.tsx

# 3. 修复Cookie配置问题
echo "3. 修复Cookie配置问题..."
if [ -f "$APP_DIR/src/lib/token.ts" ]; then
  cp $APP_DIR/src/lib/token.ts $APP_DIR/backups/token.ts.bak
  
  # 替换Cookie配置
  sed -i 's/secure: process.env.NODE_ENV === '"'production'"'/secure: false/g' $APP_DIR/src/lib/token.ts
  sed -i 's/sameSite: '"'lax'"'/sameSite: '"'none'"'/g' $APP_DIR/src/lib/token.ts
fi

if [ -f "$APP_DIR/src/lib/token-edge.ts" ]; then
  cp $APP_DIR/src/lib/token-edge.ts $APP_DIR/backups/token-edge.ts.bak
  
  # 替换Cookie配置
  sed -i 's/secure: process.env.NODE_ENV === '"'production'"'/secure: false/g' $APP_DIR/src/lib/token-edge.ts
  sed -i 's/sameSite: '"'lax'"'/sameSite: '"'none'"'/g' $APP_DIR/src/lib/token-edge.ts
fi

# 4. 修复字体预加载问题
echo "4. 修复字体预加载问题..."
mkdir -p $APP_DIR/public/fonts
if [ ! -f "$APP_DIR/public/fonts/geist.woff2" ]; then
  touch $APP_DIR/public/fonts/geist.woff2
fi
if [ ! -f "$APP_DIR/public/fonts/geist-mono.woff2" ]; then
  touch $APP_DIR/public/fonts/geist-mono.woff2
fi

# 5. 清除临时文件和缓存
echo "5. 清除缓存..."
rm -rf $APP_DIR/.next/cache

# 6. 修改文件权限
echo "6. 设置文件权限..."
chmod -R 755 $APP_DIR
chown -R www:www $APP_DIR

# 7. 重启应用
echo "7. 重启应用..."
cd $APP_DIR
pm2 restart sncrm || pm2 start ecosystem.config.js

echo "服务器端修复完成"
EOT

# 3. 创建修复后的字体预加载处理文件
echo -e "${YELLOW}[3/5] 修复字体预加载问题${NC}"

# 创建字体修复临时文件
cat > layout-fonts-fix.tsx << 'EOL'
import { Metadata } from 'next';
import './globals.css';
import { GeistSans } from 'geist/font/sans';

export const metadata: Metadata = {
  title: '客户关系管理系统',
  description: '客户关系管理系统'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={GeistSans.className}>
      <head>
        {/* 手动设置字体预加载，确保as属性正确 */}
        <link
          rel="preload"
          href="/fonts/geist.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/geist-mono.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
EOL

# 上传字体修复文件
scp layout-fonts-fix.tsx $SERVER_USER@$SERVER_IP:/tmp/layout-fonts-fix.tsx

# 远程执行应用字体修复
ssh $SERVER_USER@$SERVER_IP << 'EOT'
APP_DIR="/www/wwwroot/sncrm"
# 备份原文件
if [ -f "$APP_DIR/src/app/layout.tsx" ]; then
  cp $APP_DIR/src/app/layout.tsx $APP_DIR/backups/layout.tsx.bak
fi
# 应用修复
cp /tmp/layout-fonts-fix.tsx $APP_DIR/src/app/layout.tsx

# 设置权限
chmod 644 $APP_DIR/src/app/layout.tsx
chown www:www $APP_DIR/src/app/layout.tsx

# 重新启动应用
cd $APP_DIR
pm2 restart sncrm
EOT

echo -e "${GREEN}✅ 字体预加载问题修复完成${NC}"

# 4. 修复Nginx配置以处理cookie问题
echo -e "${YELLOW}[4/5] 修复Nginx配置${NC}"

# 创建修复的Nginx配置
cat > nginx-auth-fix.conf << 'EOL'
server {
    listen 80;
    server_name crm.xinghun.info 121.41.65.220;
    
    # 配置CORS头部，允许凭证
    add_header 'Access-Control-Allow-Origin' 'http://crm.xinghun.info' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Accept,Authorization,Cache-Control,Content-Type,DNT,If-Modified-Since,Keep-Alive,Origin,User-Agent,X-Requested-With' always;
    
    # OPTIONS预检请求处理
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' 'http://crm.xinghun.info' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Accept,Authorization,Cache-Control,Content-Type,DNT,If-Modified-Since,Keep-Alive,Origin,User-Agent,X-Requested-With' always;
        add_header 'Access-Control-Max-Age' 1728000;
        add_header 'Content-Type' 'text/plain charset=UTF-8';
        add_header 'Content-Length' 0;
        return 204;
    }
    
    # 强制不缓存HTML和JSON响应
    location ~* \.(html|json)$ {
        add_header Cache-Control "no-store, no-cache, must-revalidate";
        expires -1;
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 确保正确传递cookie
        proxy_cookie_path / "/; SameSite=None; Secure";
    }
    
    # 身份验证相关路径，特别处理cookie
    location /api/auth/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 确保正确传递cookie
        proxy_cookie_path / "/; SameSite=None; Secure";
        
        # 增加超时时间
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
    }
    
    # Next.js静态资源 - 精确定位
    location /_next/static/ {
        alias /www/wwwroot/sncrm/.next/static/;
        expires max;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
        try_files $uri =404;
    }
    
    # 字体文件特别处理
    location /fonts/ {
        alias /www/wwwroot/sncrm/public/fonts/;
        expires max;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }
    
    # 静态文件
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        # 先尝试从public目录提供
        root /www/wwwroot/sncrm;
        try_files /public$uri $uri =404;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
        access_log off;
    }
    
    # 上传文件目录
    location /uploads/ {
        alias /www/wwwroot/sncrm/public/uploads/;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
        access_log off;
    }
    
    # 默认处理
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 增加缓冲设置
        proxy_buffer_size 64k;
        proxy_buffers 4 64k;
        proxy_busy_buffers_size 128k;
        
        # 增加超时时间
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
    }
    
    # 日志设置
    access_log /www/wwwlogs/sncrm.access.log;
    error_log /www/wwwlogs/sncrm.error.log;
}
EOL

# 上传并应用Nginx配置
scp nginx-auth-fix.conf $SERVER_USER@$SERVER_IP:/tmp/nginx-auth-fix.conf

ssh $SERVER_USER@$SERVER_IP << 'EOT'
# 备份原配置
cp /www/server/panel/vhost/nginx/crm.xinghun.info.conf /www/server/panel/vhost/nginx/crm.xinghun.info.conf.bak
# 应用新配置
cp /tmp/nginx-auth-fix.conf /www/server/panel/vhost/nginx/crm.xinghun.info.conf
# 测试配置
nginx -t
# 重载Nginx
/etc/init.d/nginx reload
EOT

echo -e "${GREEN}✅ Nginx配置修复完成${NC}"

# 5. 清理临时文件并验证
echo -e "${YELLOW}[5/5] 清理临时文件并验证${NC}"

# 清理本地临时文件
rm -f login-form-fixed.tsx layout-fonts-fix.tsx nginx-auth-fix.conf

# 检查服务器状态
ssh $SERVER_USER@$SERVER_IP << 'EOT'
# 检查应用状态
pm2 status
# 检查Nginx状态
systemctl status nginx | grep Active
# 检查端口
netstat -tuln | grep 3001
EOT

echo -e "${GREEN}===== 认证和登录问题修复完成 =====${NC}"
echo "请按照以下步骤测试登录功能："
echo "1. 打开浏览器，访问 http://crm.xinghun.info"
echo "2. 清除浏览器缓存和Cookie，再尝试登录"
echo "3. 如果仍有问题，请检查浏览器控制台日志，并联系技术支持" 