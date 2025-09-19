#!/bin/bash

echo "=== 修复线上环境NEXT_PUBLIC_BASE_URL配置 ==="

# 1. 进入项目目录
echo "1. 进入项目目录..."
cd /www/wwwroot/admin.xinghun.info

# 2. 检查当前.env文件
echo "2. 检查当前.env文件..."
if [ -f ".env" ]; then
    echo "✅ .env文件存在"
    echo "当前NEXT_PUBLIC_BASE_URL配置:"
    grep "NEXT_PUBLIC_BASE_URL" .env || echo "❌ 未找到NEXT_PUBLIC_BASE_URL配置"
else
    echo "❌ .env文件不存在"
    exit 1
fi

# 3. 添加或更新NEXT_PUBLIC_BASE_URL配置
echo "3. 添加或更新NEXT_PUBLIC_BASE_URL配置..."
if ! grep -q "NEXT_PUBLIC_BASE_URL" .env; then
    echo "" >> .env
    echo "# 前端基础URL配置（用于生成签署链接等）" >> .env
    echo "NEXT_PUBLIC_BASE_URL=https://admin.xinghun.info" >> .env
    echo "✅ 已添加NEXT_PUBLIC_BASE_URL配置"
else
    # 更新现有的配置
    sed -i 's|NEXT_PUBLIC_BASE_URL=.*|NEXT_PUBLIC_BASE_URL=https://admin.xinghun.info|' .env
    echo "✅ 已更新NEXT_PUBLIC_BASE_URL配置"
fi

# 4. 验证配置
echo "4. 验证配置..."
echo "当前.env文件中的NEXT_PUBLIC_BASE_URL:"
grep "NEXT_PUBLIC_BASE_URL" .env

# 5. 重启PM2进程
echo "5. 重启PM2进程..."
pm2 restart sncrm-new
if [ $? -eq 0 ]; then
    echo "✅ PM2重启成功"
else
    echo "❌ PM2重启失败"
    exit 1
fi

# 6. 等待服务启动
echo "6. 等待服务启动..."
sleep 5

# 7. 检查服务状态
echo "7. 检查服务状态..."
pm2 status sncrm-new

# 8. 测试签署链接生成
echo "8. 测试签署链接生成..."
echo "请访问合同列表页面，创建一个新合同，检查签署链接是否显示正确的域名"

echo ""
echo "=== 修复完成 ==="
echo "如果签署链接仍然显示localhost，请检查："
echo "1. 环境变量是否正确设置"
echo "2. PM2进程是否已重启"
echo "3. 浏览器缓存是否已清除"
