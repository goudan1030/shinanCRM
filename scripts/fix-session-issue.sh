#!/bin/bash

# 重启服务端以确保清理任何潜在的缓存问题
echo "重启服务端应用..."
cd /www/wwwroot/sncrm
pm2 stop sncrm
pm2 delete sncrm

# 修复1: 使用正确的启动方式 - 使用standalone模式
echo "使用正确的启动方式..."
NODE_ENV=production PORT=3001 pm2 start .next/standalone/server.js --name sncrm

# 修复2: 强制浏览器刷新会话 - 清除Nginx缓存头
echo "修改Nginx配置以清除缓存头..."
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

# 重启Nginx服务
echo "重启Nginx服务..."
/etc/init.d/nginx reload

# 修复3: 创建前端登录重定向修复
echo "创建临时修复代码..."
cat > /www/wwwroot/sncrm/public/fix-session.js << 'EOL'
// 临时修复脚本，自动重定向到仪表板
document.addEventListener('DOMContentLoaded', function() {
  // 检查当前页面是否为登录页面
  if (window.location.pathname === '/login') {
    // 检查URL中是否有特定的重定向参数
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('autologin')) {
      console.log('自动重定向到仪表板...');
      window.location.href = '/dashboard';
    }
  }
});
EOL

# 创建一个辅助HTML文件来帮助用户清除会话并重新登录
cat > /www/wwwroot/sncrm/public/reset-session.html << 'EOL'
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
</body>
</html>
EOL

echo "会话修复脚本执行完成！"
echo "您现在可以尝试通过 http://crm.xinghun.info/reset-session.html 重置会话并重新登录" 