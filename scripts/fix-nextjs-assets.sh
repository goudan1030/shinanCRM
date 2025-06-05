#!/bin/bash

# 设置变量
SERVER_IP="8.149.244.105"
SERVER_USER="root"

echo "开始修复Next.js静态资源问题..."

# 远程执行命令
ssh $SERVER_USER@$SERVER_IP << 'EOT'
# 进入项目目录
cd /www/wwwroot/sncrm

# 为静态资源创建必要的目录
echo "创建静态资源目录..."
mkdir -p public/static/css
mkdir -p public/static/js
mkdir -p public/static/images
mkdir -p public/static/fonts

# 确保.next目录下的静态资源被正确导出
echo "导出Next.js静态资源..."
mkdir -p .next/static
mkdir -p .next/static/chunks
mkdir -p .next/static/css
mkdir -p .next/static/media

# 更新Next.js配置以支持静态资源处理
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
  // 确保静态资源被正确处理
  assetPrefix: '',
  images: {
    domains: ['crm.xinghun.info'],
    path: '/_next/image',
    loader: 'default'
  },
  // 确保静态目录被正确处理
  sassOptions: {
    includePaths: ['/www/wwwroot/sncrm/styles'],
  },
};

module.exports = nextConfig;
EOF

# 为所有静态目录设置权限
echo "设置静态资源目录权限..."
chown -R www:www /www/wwwroot/sncrm/public
chmod -R 755 /www/wwwroot/sncrm/public
chown -R www:www /www/wwwroot/sncrm/.next
chmod -R 755 /www/wwwroot/sncrm/.next

# 更新Nginx配置以正确处理静态资源
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
    
    # 处理 Next.js 静态资源
    location /_next/ {
        alias /www/wwwroot/sncrm/.next/;
        expires 365d;
        access_log off;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    # 处理 public 目录的静态文件
    location /static/ {
        alias /www/wwwroot/sncrm/public/static/;
        expires 30d;
        access_log off;
    }
    
    # 处理根目录下的静态文件
    location ~ ^/(favicon.ico|robots.txt|sitemap.xml) {
        root /www/wwwroot/sncrm/public;
        access_log off;
        expires 30d;
    }
    
    # 禁止直接访问 .next 目录
    location /.next/ {
        deny all;
        return 404;
    }
    
    # 添加额外的响应头用于调试
    add_header X-Server-Env "Production" always;
    
    access_log /www/wwwlogs/crm.xinghun.info.log;
    error_log /www/wwwlogs/crm.xinghun.info.error.log;
}
EOF

# 测试Nginx配置
echo "测试Nginx配置..."
nginx -t

# 重新加载Nginx配置
echo "重新加载Nginx配置..."
nginx -s reload

# 重新构建应用以确保静态资源被正确生成
echo "重新构建Next.js应用..."
npm run build

# 创建静态资源诊断测试页面
echo "创建静态资源测试页面..."
cat > public/static-test.html << 'EOF'
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>静态资源测试页面</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        h1 {
            color: #333;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background-color: white;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .resource-item {
            margin-bottom: 10px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .success {
            background-color: #d4edda;
            border-color: #c3e6cb;
        }
        .fail {
            background-color: #f8d7da;
            border-color: #f5c6cb;
        }
        .resource-link {
            display: block;
            margin-top: 5px;
            word-break: break-all;
        }
        .test-button {
            background-color: #007bff;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
        }
        .test-button:hover {
            background-color: #0069d9;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Next.js静态资源测试页面</h1>
        <p>此页面用于测试Next.js静态资源是否能正确加载。</p>
        
        <h2>测试项目</h2>
        <div id="test-results">
            <button class="test-button" onclick="runTests()">开始测试</button>
            <div>测试结果将显示在这里...</div>
        </div>
        
        <script>
            function testResource(url) {
                return new Promise((resolve, reject) => {
                    const startTime = performance.now();
                    fetch(url, { method: 'HEAD' })
                        .then(response => {
                            const endTime = performance.now();
                            const duration = Math.round(endTime - startTime);
                            resolve({
                                url,
                                status: response.status,
                                success: response.ok,
                                duration
                            });
                        })
                        .catch(error => {
                            resolve({
                                url,
                                status: 0,
                                success: false,
                                error: error.message
                            });
                        });
                });
            }
            
            async function runTests() {
                const resultsDiv = document.getElementById('test-results');
                resultsDiv.innerHTML = '<h3>测试中...</h3>';
                
                // 测试的资源URL列表
                const resources = [
                    '/_next/static/chunks/main.js',
                    '/_next/static/css/main.css',
                    '/static/css/style.css',
                    '/static/js/main.js',
                    '/static/images/logo.png',
                    '/favicon.ico',
                    '/robots.txt'
                ];
                
                const results = await Promise.all(resources.map(testResource));
                
                let html = '<h3>测试结果</h3>';
                let successCount = 0;
                let failCount = 0;
                
                results.forEach(result => {
                    if (result.success) {
                        successCount++;
                    } else {
                        failCount++;
                    }
                    
                    html += `
                        <div class="resource-item ${result.success ? 'success' : 'fail'}">
                            <strong>${result.url}</strong>: ${result.success ? '成功' : '失败'} 
                            (状态码: ${result.status}, 耗时: ${result.duration || 'N/A'}ms)
                            <a href="${result.url}" target="_blank" class="resource-link">点击查看资源</a>
                        </div>
                    `;
                });
                
                html += `<div><strong>总结:</strong> 成功 ${successCount} 项, 失败 ${failCount} 项</div>`;
                
                resultsDiv.innerHTML = html;
            }
        </script>
    </div>
</body>
</html>
EOF

# 重启应用
echo "重启Next.js应用..."
pm2 restart sncrm

echo "Next.js静态资源问题修复完成。您可以访问 http://crm.xinghun.info/static-test.html 测试静态资源是否正常。"
EOT

echo "Next.js静态资源修复脚本已运行。"
echo "请访问 http://crm.xinghun.info/static-test.html 测试静态资源。" 