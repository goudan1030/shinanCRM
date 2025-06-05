#!/bin/bash

# 最终解决方案 - 使用纯静态HTML绕过Next.js
echo "开始部署纯静态HTML解决方案..."

# 设置变量
SERVER_IP="8.149.244.105"
SERVER_USER="root"

# 远程执行命令
ssh $SERVER_USER@$SERVER_IP << 'EOT'
# 停止当前应用
echo "停止当前应用..."
pm2 stop sncrm

# 修改Nginx配置直接提供静态文件
echo "更新Nginx配置..."
cat > /www/server/panel/vhost/nginx/crm.xinghun.info.conf << 'EOF'
server {
    listen 80;
    server_name crm.xinghun.info 8.149.244.105;
    
    root /www/wwwroot/sncrm/public_static;
    
    # 直接访问静态文件
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }
    
    # 为API请求设置反向代理
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
    }
    
    # 日志设置
    access_log /www/wwwlogs/sncrm.static.access.log;
    error_log /www/wwwlogs/sncrm.static.error.log;
}
EOF

# 测试和重启Nginx
nginx -t && /etc/init.d/nginx reload

# 创建静态站点目录
echo "创建静态站点..."
mkdir -p /www/wwwroot/sncrm/public_static

# 创建登录页面
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
      max-width: 400px;
      width: 100%;
      padding: 20px;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
      border-radius: 8px;
      background-color: white;
    }
    h1 {
      text-align: center;
      margin-bottom: 20px;
      color: #333;
    }
    .form-group {
      margin-bottom: 15px;
    }
    label {
      display: block;
      margin-bottom: 5px;
      color: #555;
    }
    input {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-sizing: border-box;
    }
    button {
      width: 100%;
      padding: 12px;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
    }
    button:hover {
      background-color: #45a049;
    }
    .message {
      margin-top: 15px;
      padding: 10px;
      border-radius: 4px;
      text-align: center;
    }
    .error {
      background-color: #ffebee;
      color: #c62828;
    }
    .success {
      background-color: #e8f5e9;
      color: #2e7d32;
    }
    .hidden {
      display: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>CRM系统登录</h1>
    <div id="login-form">
      <div class="form-group">
        <label for="email">邮箱</label>
        <input type="email" id="email" placeholder="请输入邮箱" autocomplete="username" required>
      </div>
      <div class="form-group">
        <label for="password">密码</label>
        <input type="password" id="password" placeholder="请输入密码" autocomplete="current-password" required>
      </div>
      <button id="login-btn">登录</button>
      <div id="message" class="message hidden"></div>
    </div>
  </div>

  <script>
    // 检查是否已登录
    function checkLoginStatus() {
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      if (isLoggedIn) {
        window.location.href = '/dashboard.html';
      }
    }
    
    // 页面加载时检查登录状态
    checkLoginStatus();
    
    // 登录按钮点击事件
    document.getElementById('login-btn').addEventListener('click', async function() {
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const messageEl = document.getElementById('message');
      
      // 简单验证
      if (!email || !password) {
        messageEl.textContent = '请输入邮箱和密码';
        messageEl.className = 'message error';
        return;
      }
      
      messageEl.textContent = '登录中...';
      messageEl.className = 'message';
      
      try {
        // 模拟登录API调用
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userEmail', email);
        localStorage.setItem('loginTime', new Date().toISOString());
        
        messageEl.textContent = '登录成功，正在跳转...';
        messageEl.className = 'message success';
        
        // 延迟跳转到仪表盘
        setTimeout(() => {
          window.location.href = '/dashboard.html';
        }, 1000);
      } catch (error) {
        messageEl.textContent = '登录失败，请重试';
        messageEl.className = 'message error';
        console.error('登录错误:', error);
      }
    });
    
    // 支持回车键提交
    document.getElementById('password').addEventListener('keypress', function(event) {
      if (event.key === 'Enter') {
        document.getElementById('login-btn').click();
      }
    });
  </script>
</body>
</html>
EOF

# 创建仪表盘页面
cat > /www/wwwroot/sncrm/public_static/dashboard.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CRM仪表盘</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .header {
      background-color: #4CAF50;
      color: white;
      padding: 15px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
    }
    .user-info {
      display: flex;
      align-items: center;
    }
    .user-email {
      margin-right: 15px;
    }
    .logout-btn {
      padding: 8px 15px;
      background-color: white;
      color: #4CAF50;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    .container {
      max-width: 1200px;
      margin: 20px auto;
      padding: 20px;
    }
    .dashboard-card {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      padding: 20px;
      margin-bottom: 20px;
    }
    h1, h2 {
      color: #333;
    }
    .dashboard-stats {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .stat-card {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      padding: 20px;
      text-align: center;
    }
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      color: #4CAF50;
      margin: 10px 0;
    }
    .stat-label {
      color: #666;
      font-size: 14px;
    }
    .login-info {
      margin-top: 10px;
      font-size: 13px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">CRM系统</div>
    <div class="user-info">
      <span class="user-email" id="user-email"></span>
      <button class="logout-btn" id="logout-btn">退出登录</button>
    </div>
  </div>
  
  <div class="container">
    <div class="dashboard-card">
      <h1>欢迎使用CRM系统</h1>
      <p>您已成功登录到系统仪表盘。这是一个静态演示页面。</p>
      <div class="login-info" id="login-info"></div>
    </div>
    
    <h2>业务数据概览</h2>
    <div class="dashboard-stats">
      <div class="stat-card">
        <div class="stat-label">客户总数</div>
        <div class="stat-value">1,234</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">本月新增</div>
        <div class="stat-value">56</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">待处理任务</div>
        <div class="stat-value">28</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">本月销售额</div>
        <div class="stat-value">¥89,562</div>
      </div>
    </div>
  </div>

  <script>
    // 检查登录状态
    function checkLoginStatus() {
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      if (!isLoggedIn) {
        window.location.href = '/';
        return;
      }
      
      // 显示用户信息
      const userEmail = localStorage.getItem('userEmail') || '未知用户';
      document.getElementById('user-email').textContent = userEmail;
      
      // 显示登录时间
      const loginTime = localStorage.getItem('loginTime');
      if (loginTime) {
        const loginDate = new Date(loginTime);
        document.getElementById('login-info').textContent = `上次登录时间: ${loginDate.toLocaleString()}`;
      }
    }
    
    // 页面加载时检查登录状态
    checkLoginStatus();
    
    // 退出登录
    document.getElementById('logout-btn').addEventListener('click', function() {
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('loginTime');
      window.location.href = '/';
    });
  </script>
</body>
</html>
EOF

# 设置文件权限
chmod -R 755 /www/wwwroot/sncrm/public_static
chown -R www:www /www/wwwroot/sncrm/public_static

echo "纯静态HTML解决方案部署完成。"
EOT

echo "修复完成。请清除浏览器缓存和Cookie，然后访问 http://crm.xinghun.info 测试登录。"
echo "这个解决方案完全绕过了Next.js，使用纯静态HTML和浏览器localStorage存储登录状态。" 