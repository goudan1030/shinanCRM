#!/bin/bash

echo "=== 设置本地开发环境 ==="

# 1. 检查是否已存在.env.local
if [ -f ".env.local" ]; then
    echo "⚠️ .env.local文件已存在"
    read -p "是否要覆盖现有配置？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "取消操作"
        exit 0
    fi
fi

# 2. 创建.env.local文件
echo "1. 创建.env.local文件..."
cat > .env.local << 'EOF'
# 数据库配置
DB_HOST=8.149.244.105
DB_PORT=3306
DB_USER=h5_cloud_user
DB_PASSWORD=mc72TNcMmy6HCybH
DB_NAME=h5_cloud_db

# Supabase配置（如果需要，请提供实际值）
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# JWT配置（生成的安全随机字符串）
JWT_SECRET=sn8we6nRudHjsDnso7h3Qzpr5Pax8Jwe

# 服务器配置
SERVER_URL=http://8.149.244.105:8888/

# 前端基础URL配置（用于生成签署链接等）
# 本地开发环境
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# iOS推送通知配置 (APNs)
APNS_KEY_ID=FVJGPT3N75
APNS_TEAM_ID=V55YBFHJXZ
APNS_BUNDLE_ID=com.xinghun.xingyouapp.XingYouApp
APNS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgjJVP7IvDBD62PrW3
uj+/jDneluYTB2xVxVTZsZ34dvmgCgYIKoZIzj0DAQehRANCAASBUTGeKK3LPYwi
NXOIo15W/Bzx0wT8OoxmYbSVIRp8q9nbPHyxMnP7cK8c8N1rnXLqKKouyrf/K3bb
R+8vHArP
-----END PRIVATE KEY-----
APNS_ENVIRONMENT=development
EOF

echo "✅ .env.local文件创建成功"

# 3. 验证配置
echo "2. 验证配置..."
echo "NEXT_PUBLIC_BASE_URL配置:"
grep "NEXT_PUBLIC_BASE_URL" .env.local

# 4. 提示下一步操作
echo ""
echo "=== 本地环境设置完成 ==="
echo "现在可以运行以下命令启动开发服务器："
echo "npm run dev"
echo ""
echo "签署链接将使用: http://localhost:3000"
echo "线上环境将使用: https://admin.xinghun.info"
