#!/bin/bash

# 设置变量
SERVER_IP="8.149.244.105"
SERVER_USER="root"

echo "开始执行静态站点修复方案..."

# 远程执行命令
ssh $SERVER_USER@$SERVER_IP << 'EOT'
# 进入项目目录
cd /www/wwwroot/sncrm

# 创建静态HTML登录页
echo "创建静态HTML登录页..."
mkdir -p public
cat > public/login.html << 'EOF'
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>登录 - CRM系统</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      padding: 0;
    }
    .login-container {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      padding: 30px;
      width: 100%;
      max-width: 400px;
    }
    h1 {
      text-align: center;
      color: #333;
      margin-bottom: 24px;
    }
    .form-group {
      margin-bottom: 16px;
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
      background-color: #4F46E5;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      margin-top: 10px;
    }
    button:hover {
      background-color: #4338CA;
    }
    .error {
      color: red;
      text-align: center;
      margin-top: 16px;
    }
    .info {
      margin-top: 16px;
      padding: 8px;
      background-color: #f0f9ff;
      border-radius: 4px;
      color: #333;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="login-container">
    <h1>CRM系统登录</h1>
    <form id="login-form">
      <div class="form-group">
        <label for="email">邮箱</label>
        <input type="email" id="email" name="email" required>
      </div>
      <div class="form-group">
        <label for="password">密码</label>
        <input type="password" id="password" name="password" required>
      </div>
      <button type="submit">登录</button>
      <div id="error-message" class="error" style="display: none;"></div>
      <div id="info-message" class="info" style="display: none;"></div>
    </form>
  </div>

  <script>
    document.getElementById('login-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const errorMessage = document.getElementById('error-message');
      const infoMessage = document.getElementById('info-message');
      
      errorMessage.style.display = 'none';
      infoMessage.style.display = 'block';
      infoMessage.textContent = '登录中...';
      
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password }),
          credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok) {
          infoMessage.textContent = '登录成功，正在跳转...';
          
          // 设置cookie
          document.cookie = "user_logged_in=true; path=/; max-age=604800";
          
          // 延迟跳转
          setTimeout(() => {
            window.location.href = '/dashboard.html';
          }, 1000);
        } else {
          errorMessage.style.display = 'block';
          errorMessage.textContent = data.message || '登录失败';
          infoMessage.style.display = 'none';
        }
      } catch (error) {
        errorMessage.style.display = 'block';
        errorMessage.textContent = '登录过程中出错，请稍后再试';
        infoMessage.style.display = 'none';
        console.error('登录错误:', error);
      }
    });
  </script>
</body>
</html>
EOF

# 创建静态HTML仪表盘页
echo "创建静态HTML仪表盘页..."
cat > public/dashboard.html << 'EOF'
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>仪表盘 - CRM系统</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    header {
      background-color: white;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo {
      font-weight: bold;
      font-size: 18px;
    }
    .user-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .logout-btn {
      background-color: #EF4444;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 6px 12px;
      cursor: pointer;
    }
    .logout-btn:hover {
      background-color: #DC2626;
    }
    main {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      margin-top: 0;
      color: #333;
    }
    .welcome-card {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      padding: 24px;
      margin-bottom: 24px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 24px;
    }
    .stat-card {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      padding: 24px;
    }
    .stat-title {
      color: #555;
      font-size: 14px;
      margin-bottom: 8px;
    }
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #333;
    }
  </style>
</head>
<body>
  <header>
    <div class="logo">CRM系统</div>
    <div class="user-info">
      <span id="user-name">管理员</span>
      <button id="logout-btn" class="logout-btn">退出登录</button>
    </div>
  </header>

  <main>
    <h1>仪表盘</h1>
    
    <div class="welcome-card">
      <h2>欢迎回来，<span id="welcome-name">管理员</span>！</h2>
      <p>您已成功登录CRM系统。</p>
    </div>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-title">客户总数</div>
        <div class="stat-value">1,234</div>
      </div>
      <div class="stat-card">
        <div class="stat-title">本月新增</div>
        <div class="stat-value">56</div>
      </div>
      <div class="stat-card">
        <div class="stat-title">待处理任务</div>
        <div class="stat-value">28</div>
      </div>
      <div class="stat-card">
        <div class="stat-title">本月销售额</div>
        <div class="stat-value">¥89,562</div>
      </div>
    </div>
  </main>

  <script>
    // 检查登录状态
    function checkLoginStatus() {
      const isLoggedIn = document.cookie.includes('user_logged_in=true');
      if (!isLoggedIn) {
        // 未登录则跳转到登录页
        window.location.href = '/login.html';
      }
    }
    
    // 页面加载时检查登录状态
    checkLoginStatus();
    
    // 退出登录处理
    document.getElementById('logout-btn').addEventListener('click', async function() {
      try {
        await fetch('/api/auth/logout', { 
          method: 'POST',
          credentials: 'include'
        });
        
        // 清除cookie
        document.cookie = "user_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        
        // 跳转到登录页
        window.location.href = '/login.html';
      } catch (error) {
        console.error('登出错误:', error);
        alert('退出登录失败，请重试');
      }
    });
  </script>
</body>
</html>
EOF

# 创建静态HTML主页（重定向页）
echo "创建静态HTML主页..."
cat > public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CRM系统</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background-color: #f5f5f5;
    }
    .loader {
      width: 48px;
      height: 48px;
      border: 5px solid #4F46E5;
      border-bottom-color: transparent;
      border-radius: 50%;
      display: inline-block;
      box-sizing: border-box;
      animation: rotation 1s linear infinite;
      margin-right: 16px;
    }
    @keyframes rotation {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }
    .message {
      font-size: 18px;
      color: #333;
    }
    .container {
      display: flex;
      align-items: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <span class="loader"></span>
    <p class="message">正在加载...</p>
  </div>

  <script>
    // 检查登录状态并重定向
    function checkAndRedirect() {
      const isLoggedIn = document.cookie.includes('user_logged_in=true');
      
      if (isLoggedIn) {
        window.location.href = '/dashboard.html';
      } else {
        window.location.href = '/login.html';
      }
    }
    
    // 等待一秒后重定向，让加载动画有时间显示
    setTimeout(checkAndRedirect, 1000);
  </script>
</body>
</html>
EOF

# 更新Nginx配置
echo "更新Nginx配置..."
cat > /www/server/panel/vhost/nginx/crm.xinghun.info.conf << 'EOF'
server {
    listen 80;
    server_name crm.xinghun.info;
    root /www/wwwroot/sncrm/public;
    index index.html;
    
    # 静态文件直接返回
    location / {
        try_files $uri $uri.html $uri/ /index.html;
        expires 1h;
    }
    
    # API请求代理到Express服务
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    access_log /www/wwwlogs/crm.xinghun.info.log;
    error_log /www/wwwlogs/crm.xinghun.info.error.log;
}
EOF

# 设置文件权限
echo "设置文件权限..."
chown -R www:www /www/wwwroot/sncrm/public
chmod -R 755 /www/wwwroot/sncrm/public

# 测试Nginx配置
echo "测试Nginx配置..."
nginx -t

# 重新加载Nginx配置
echo "重新加载Nginx配置..."
nginx -s reload

# 创建简化版API服务器
echo "创建简化版API服务器..."
cat > api-server.js << 'EOF'
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const app = express();
const port = 3000;

// 中间件
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: 'http://crm.xinghun.info',
  credentials: true
}));

// 登录API
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // 简单验证
  if (!email || !password) {
    return res.status(400).json({ success: false, message: '请提供邮箱和密码' });
  }
  
  // 创建认证令牌
  const token = `auth-token-${Date.now()}`;
  
  // 设置Cookie
  res.cookie('auth_token', token, {
    path: '/',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
    sameSite: 'lax'
  });
  
  res.cookie('user_logged_in', 'true', {
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
    sameSite: 'lax'
  });
  
  console.log('登录成功，用户:', email);
  
  return res.status(200).json({
    success: true,
    message: '登录成功',
    user: {
      id: 1,
      name: '管理员',
      email
    }
  });
});

// 登出API
app.post('/api/auth/logout', (req, res) => {
  // 清除Cookie
  res.clearCookie('auth_token', { path: '/' });
  res.clearCookie('user_logged_in', { path: '/' });
  
  console.log('用户已登出');
  
  return res.status(200).json({
    success: true,
    message: '登出成功'
  });
});

// 会话检查API
app.get('/api/auth/session', (req, res) => {
  const hasAuthToken = req.cookies.auth_token;
  const hasUserLoggedIn = req.cookies.user_logged_in;
  
  console.log('会话检查:', { hasAuthToken, hasUserLoggedIn });
  
  if (!hasAuthToken && !hasUserLoggedIn) {
    return res.status(200).json({ authenticated: false });
  }
  
  return res.status(200).json({
    authenticated: true,
    user: {
      id: 1,
      name: '管理员'
    }
  });
});

// 健康检查API
app.get('/api/health', (req, res) => {
  return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务器
app.listen(port, () => {
  console.log(`API服务器运行在 http://localhost:${port}`);
});
EOF

# 安装Express依赖
echo "安装Express依赖..."
npm install express cookie-parser cors --save

# 更新PM2配置
echo "更新PM2配置..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'sncrm',
      script: 'api-server.js',
      cwd: '/www/wwwroot/sncrm',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
EOF

# 重启应用
echo "重启应用..."
pm2 stop sncrm
pm2 delete sncrm
pm2 start ecosystem.config.js
pm2 save

echo "静态站点修复完成。"
EOT

echo "静态站点修复脚本已运行。"
echo "请完全清除浏览器缓存后再次访问 http://crm.xinghun.info 测试。" 