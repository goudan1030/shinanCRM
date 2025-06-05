#!/bin/bash

# 登录问题诊断脚本
# 用于检查和诊断登录相关的各种配置和问题

# 设置颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}===== SNCRM登录问题诊断工具 =====${NC}"

# 设置变量
APP_DIR="/www/wwwroot/sncrm"
SERVER_IP="8.149.244.105"
SERVER_USER="root"

# 诊断信息提示
echo "此工具将检查可能导致登录问题的各种配置和设置。"
echo "诊断过程不会修改任何文件，仅收集信息用于分析。"
echo "请提供登录失败时在浏览器控制台中看到的错误信息。"

# 开始诊断
echo -e "${YELLOW}===== 开始诊断 =====${NC}"

# 远程执行诊断
ssh $SERVER_USER@$SERVER_IP << 'EOT'
echo "===== 在服务器端执行诊断 ====="

# 设置目录
APP_DIR="/www/wwwroot/sncrm"

# 1. 检查环境变量
echo -e "【1】检查环境变量"
if [ -f "$APP_DIR/.env.production" ]; then
  echo "✅ .env.production文件存在"
  # 检查JWT密钥
  grep -q "JWT_SECRET" $APP_DIR/.env.production
  if [ $? -eq 0 ]; then
    echo "✅ JWT密钥已配置"
  else
    echo "❌ JWT密钥未配置"
  fi
else
  echo "❌ .env.production文件不存在"
fi
echo

# 2. 检查Token文件
echo -e "【2】检查Token处理文件"
if [ -f "$APP_DIR/src/lib/token.ts" ]; then
  echo "✅ token.ts文件存在"
  
  # 检查Cookie配置
  grep -A 10 "setTokenCookie" $APP_DIR/src/lib/token.ts
else
  echo "❌ token.ts文件不存在"
fi
echo

# 3. 检查API路由
echo -e "【3】检查登录API路由"
if [ -f "$APP_DIR/src/app/api/auth/login/route.ts" ]; then
  echo "✅ 登录API路由文件存在"
  
  # 检查关键函数
  grep -q "setTokenCookie" $APP_DIR/src/app/api/auth/login/route.ts
  if [ $? -eq 0 ]; then
    echo "✅ setTokenCookie函数调用存在"
  else
    echo "❌ setTokenCookie函数调用不存在"
  fi
else
  echo "❌ 登录API路由文件不存在"
fi
echo

# 4. 检查中间件配置
echo -e "【4】检查中间件配置"
if [ -f "$APP_DIR/middleware.ts" ]; then
  echo "✅ 中间件文件存在"
  
  # 检查公共路由配置
  grep -A 10 "publicRoutes" $APP_DIR/middleware.ts
else
  echo "❌ 中间件文件不存在"
fi
echo

# 5. 检查Nginx配置
echo -e "【5】检查Nginx配置"
if [ -f "/www/server/panel/vhost/nginx/crm.xinghun.info.conf" ]; then
  echo "✅ Nginx配置文件存在"
  
  # 检查关键配置
  grep -q "proxy_cookie_path" /www/server/panel/vhost/nginx/crm.xinghun.info.conf
  if [ $? -eq 0 ]; then
    echo "✅ proxy_cookie_path配置存在"
  else
    echo "❌ proxy_cookie_path配置不存在"
  fi
  
  grep -q "SameSite" /www/server/panel/vhost/nginx/crm.xinghun.info.conf
  if [ $? -eq 0 ]; then
    echo "✅ SameSite配置存在"
  else
    echo "❌ SameSite配置不存在"
  fi
else
  echo "❌ Nginx配置文件不存在"
fi
echo

# 6. 检查登录表单组件
echo -e "【6】检查登录表单组件"
if [ -f "$APP_DIR/src/components/login-form.tsx" ]; then
  echo "✅ 登录表单组件文件存在"
  
  # 检查autoComplete属性
  grep -q "autoComplete" $APP_DIR/src/components/login-form.tsx
  if [ $? -eq 0 ]; then
    echo "✅ autoComplete属性已设置"
  else
    echo "❌ autoComplete属性未设置"
  fi
  
  # 检查credentials配置
  grep -q "credentials: 'include'" $APP_DIR/src/components/login-form.tsx
  if [ $? -eq 0 ]; then
    echo "✅ credentials配置已设置"
  else
    echo "❌ credentials配置未设置"
  fi
else
  echo "❌ 登录表单组件文件不存在"
fi
echo

# 7. 检查字体预加载
echo -e "【7】检查字体预加载"
if [ -f "$APP_DIR/src/app/layout.tsx" ]; then
  echo "✅ 布局文件存在"
  
  # 检查字体预加载配置
  grep -q "as=\"font\"" $APP_DIR/src/app/layout.tsx
  if [ $? -eq 0 ]; then
    echo "✅ 字体预加载as属性已正确设置"
  else
    echo "❌ 字体预加载as属性未正确设置"
  fi
else
  echo "❌ 布局文件不存在"
fi

# 检查字体文件
if [ -d "$APP_DIR/public/fonts" ]; then
  echo "✅ 字体目录存在"
  if [ -f "$APP_DIR/public/fonts/geist.woff2" ] && [ -f "$APP_DIR/public/fonts/geist-mono.woff2" ]; then
    echo "✅ 字体文件存在"
  else
    echo "❌ 字体文件不完整"
  fi
else
  echo "❌ 字体目录不存在"
fi
echo

# 8. 检查日志中的错误
echo -e "【8】检查日志中的错误"
# 检查PM2日志
if [ -f "/root/.pm2/logs/sncrm-error.log" ]; then
  echo "✅ PM2错误日志文件存在"
  
  # 提取最近的错误
  echo "最近的错误日志:"
  grep -i "error\|exception\|warning" /root/.pm2/logs/sncrm-error.log | tail -10
else
  echo "❌ PM2错误日志文件不存在"
fi

# 检查Nginx错误日志
if [ -f "/www/wwwlogs/sncrm.error.log" ]; then
  echo "✅ Nginx错误日志文件存在"
  
  # 提取最近的错误
  echo "最近的Nginx错误日志:"
  grep -i "error" /www/wwwlogs/sncrm.error.log | tail -5
else
  echo "❌ Nginx错误日志文件不存在"
fi
echo

# 9. 检查系统状态
echo -e "【9】检查系统状态"
# 检查端口监听
netstat -tuln | grep 3001
if [ $? -eq 0 ]; then
  echo "✅ 3001端口正在监听"
else
  echo "❌ 3001端口未监听"
fi

# 检查PM2进程
pm2 list | grep sncrm
if [ $? -eq 0 ]; then
  echo "✅ PM2进程正在运行"
else
  echo "❌ PM2进程未运行"
fi

# 检查Nginx状态
systemctl status nginx | grep "Active:"
if [ $? -eq 0 ]; then
  echo "✅ Nginx服务正在运行"
else
  echo "❌ Nginx服务未运行"
fi
echo

echo "===== 服务器端诊断完成 ====="
EOT

echo -e "${GREEN}===== 诊断完成 =====${NC}"
echo "根据以上诊断结果，您可以采取以下步骤解决问题:"
echo "1. 如果环境变量缺失，请运行 './scripts/fix-auth-issues.sh' 修复"
echo "2. 如果Cookie配置不正确，请运行 './scripts/fix-auth-issues.sh' 修复"
echo "3. 如果字体预加载错误，请运行 './scripts/fix-auth-issues.sh' 修复"
echo "4. 如果服务未运行，请在服务器上运行 'pm2 start ecosystem.config.js'"
echo "5. 如果仍有问题，请清除浏览器缓存和Cookie，然后重试"
echo
echo "如有其他问题，请联系技术支持，并提供上述诊断信息。" 