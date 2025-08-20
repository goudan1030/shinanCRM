#!/bin/bash

echo "=== SNCRM 服务器部署脚本 ==="
echo "开始部署到服务器..."

# 1. 进入项目目录
echo "1. 进入项目目录..."
cd /www/wwwroot/admin.xinghun.info

# 2. 检查当前状态
echo "2. 检查当前状态..."
echo "当前目录: $(pwd)"
echo "当前分支: $(git branch --show-current)"
echo "最新提交: $(git log -1 --oneline)"

# 3. 拉取最新代码
echo "3. 拉取最新代码..."
git fetch origin
git reset --hard origin/main
echo "代码更新完成"

# 4. 检查环境变量
echo "4. 检查环境变量..."
if [ -f ".env" ]; then
    echo "✅ .env文件存在"
    echo "APNS配置检查:"
    grep -E "APNS_(KEY_ID|TEAM_ID|BUNDLE_ID|PRIVATE_KEY|ENVIRONMENT)" .env | while read line; do
        if [[ $line == *"PRIVATE_KEY"* ]]; then
            echo "  $line" | cut -d'=' -f1"=已配置"
        else
            echo "  $line"
        fi
    done
else
    echo "❌ .env文件不存在"
    exit 1
fi

# 5. 安装依赖
echo "5. 安装依赖..."
npm install
echo "依赖安装完成"

# 6. 检查apn包
echo "6. 检查apn包..."
if npm list apn > /dev/null 2>&1; then
    echo "✅ apn包已安装"
else
    echo "安装apn包..."
    npm install apn
fi

# 7. 构建项目
echo "7. 构建项目..."
npm run build
if [ $? -eq 0 ]; then
    echo "✅ 构建成功"
else
    echo "❌ 构建失败"
    exit 1
fi

# 8. 重启PM2进程
echo "8. 重启PM2进程..."
pm2 restart sncrm-new
if [ $? -eq 0 ]; then
    echo "✅ PM2重启成功"
else
    echo "❌ PM2重启失败"
    exit 1
fi

# 9. 等待服务启动
echo "9. 等待服务启动..."
sleep 5

# 10. 检查服务状态
echo "10. 检查服务状态..."
pm2 status sncrm-new

# 11. 查看最新日志
echo "11. 查看最新日志..."
echo "=== 最新20行日志 ==="
pm2 logs sncrm-new --lines 20 --nostream

echo ""
echo "=== 部署完成 ==="
echo "请检查日志确认服务正常运行"
echo "如果看到'APNs推送失败，回退到模拟发送'，说明配置有问题"
echo "如果看到'APNs推送成功'，说明配置正确"
