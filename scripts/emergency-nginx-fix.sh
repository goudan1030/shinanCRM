#!/bin/bash

# 紧急修复 - 直接修改Nginx配置

CONF_FILE="/www/server/panel/vhost/nginx/admin.xinghun.info.conf"

echo "🔧 紧急修复Nginx配置..."

# 备份
cp "$CONF_FILE" "${CONF_FILE}.bak.$(date +%Y%m%d_%H%M%S)"

# 使用Python直接修改文件
python3 << 'PYEOF'
import re

conf_file = "/www/server/panel/vhost/nginx/admin.xinghun.info.conf"

with open(conf_file, 'r', encoding='utf-8') as f:
    content = f.read()

# 要添加的配置
new_config = '''    # ========== Next.js静态资源修复 ==========
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_buffering off;
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }
    
    location ~* \\.js$ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_buffering off;
        add_header Content-Type "application/javascript; charset=utf-8" always;
    }
    
    location /fonts/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }
    # ========== 配置结束 ==========
'''

# 删除旧的配置
content = re.sub(r'# ==========.*?配置结束 ==========\n', '', content, flags=re.DOTALL)

# 在 location / { 之前插入
if 'location / {' in content:
    content = content.replace('    location / {', new_config + '\n    location / {')
else:
    # 如果找不到，在server {之后插入
    content = content.replace('    server {', '    server {\n' + new_config, 1)

with open(conf_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ 配置已更新")
PYEOF

# 测试并重载
echo "🧪 测试配置..."
/www/server/nginx/sbin/nginx -t && /www/server/nginx/sbin/nginx -s reload && echo "✅ 修复完成！" || echo "❌ 配置错误，请检查"
