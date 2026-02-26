#!/bin/bash

# 创建Nginx includes目录
echo "创建Nginx includes目录..."
mkdir -p /www/server/panel/vhost/nginx/includes

# 创建注入脚本
echo "创建注入脚本..."
cat > /www/server/panel/vhost/nginx/includes/injection.conf << 'EOL'
# 登录页面注入辅助脚本
location = /login {
  proxy_pass http://127.0.0.1:3001;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  
  # 注入辅助脚本
  sub_filter '</head>' '<script src="/login-helper.js"></script></head>';
  sub_filter_once on;
}
EOL

# 修改Nginx配置，加载注入模块
echo "修改Nginx配置，加载注入模块..."
if ! grep -q "include /www/server/panel/vhost/nginx/includes/" /www/server/nginx/conf/nginx.conf; then
  # 更新主配置
  sed -i '/http {/a \    include /www/server/panel/vhost/nginx/includes/*.conf;' /www/server/nginx/conf/nginx.conf
fi

# 检查Nginx配置
echo "检查Nginx配置..."
nginx -t

# 重启Nginx
echo "重启Nginx服务..."
/etc/init.d/nginx reload

echo "注入脚本修复完成！" 