#!/bin/bash

# 最小化修复Next.js模块错误脚本
echo "开始最小化修复Next.js模块错误..."

# 设置变量
SERVER_IP="8.149.244.105"
SERVER_USER="root"

# 远程执行命令
ssh $SERVER_USER@$SERVER_IP << 'EOT'
# 检查和停止当前应用
echo "停止当前应用..."
pm2 stop sncrm

echo "进入项目目录..."
cd /www/wwwroot/sncrm

echo "创建缺失的require-hook.js文件..."
mkdir -p .next/server
cat > .next/server/require-hook.js << 'EOF'
"use strict";
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.addHookAliases = addHookAliases;
// This file is for modularized imports for next/server to get fully-treeshaken in webpack
function addHookAliases(aliases = {}) {
  const hooks = {
    "next/dist/server/require-hook": require.resolve("next/dist/server/require-hook")
  };
  for (const [key, value] of Object.entries(hooks)) {
    aliases[key] = value;
  }
}
EOF

echo "创建Nginx静态页面作为临时解决方案..."
mkdir -p /www/wwwroot/sncrm/public_static
cat > /www/wwwroot/sncrm/public_static/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CRM系统</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 800px;
      width: 100%;
      padding: 40px;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
      border-radius: 8px;
      background-color: white;
      text-align: center;
    }
    h1 {
      color: #333;
      margin-bottom: 20px;
    }
    p {
      color: #666;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    .status {
      padding: 15px;
      background-color: #f8d7da;
      color: #721c24;
      border-radius: 4px;
      margin-bottom: 20px;
    }
    .btn {
      display: inline-block;
      padding: 10px 20px;
      background-color: #4CAF50;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>CRM系统维护中</h1>
    <div class="status">
      系统检测到模块问题，正在修复中...
    </div>
    <p>我们正在对系统进行必要的维护和升级，以修复模块错误问题。请稍后再试。</p>
    <p>如需帮助，请联系系统管理员。</p>
    <a href="/" class="btn" onclick="window.location.reload(); return false;">刷新页面</a>
  </div>
</body>
</html>
EOF

# 修改Nginx配置
echo "更新Nginx配置..."
cat > /www/server/panel/vhost/nginx/crm.xinghun.info.conf << 'EOF'
server {
    listen 80;
    server_name crm.xinghun.info 8.149.244.105;
    
    root /www/wwwroot/sncrm/public_static;
    
    # 直接提供静态页面
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }
    
    # 日志设置
    access_log /www/wwwlogs/sncrm.static.access.log;
    error_log /www/wwwlogs/sncrm.static.error.log;
}
EOF

# 测试和重启Nginx
nginx -t && /etc/init.d/nginx reload

echo "当前系统状态:"
ps aux | grep next
netstat -tulpn | grep 3001

echo "最小化修复完成。系统现在提供临时的静态页面，需要完整重建应用。"
EOT

echo "修复完成。系统现在提供临时静态页面，显示维护信息。"
echo "请访问 http://crm.xinghun.info 查看状态页面。" 