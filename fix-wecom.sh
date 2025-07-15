#!/bin/bash

echo "🚀 开始修复企业微信验证问题..."

# 1. 部署新的验证接口
echo "📦 部署代码..."
npm run build
pm2 restart sncrm-new

# 2. 修改nginx配置
echo "🔧 修改nginx配置..."
sudo cp /www/server/panel/vhost/nginx/admin.xinghun.info.conf /www/server/panel/vhost/nginx/admin.xinghun.info.conf.backup

# 检查是否已经有企业微信配置
if ! grep -q "/api/wecom/" /www/server/panel/vhost/nginx/admin.xinghun.info.conf; then
    echo "添加企业微信配置到nginx..."
    # 在location /之前插入企业微信配置
    sudo sed -i '/location \//i\    # 企业微信回调 - 不重定向\n    location /api/wecom/ {\n        proxy_pass http://127.0.0.1:3002;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }\n' /www/server/panel/vhost/nginx/admin.xinghun.info.conf
fi

# 3. 重启nginx
echo "🔄 重启nginx..."
sudo nginx -t && sudo nginx -s reload

echo "✅ 修复完成！"
echo ""
echo "📝 现在在企业微信管理后台配置："
echo "URL: https://admin.xinghun.info/api/wecom/simple"
echo "Token: L411dhQg"
echo ""
echo "🔍 测试链接："
echo "curl 'https://admin.xinghun.info/api/wecom/simple?msg_signature=test&timestamp=test&nonce=test&echostr=test'" 