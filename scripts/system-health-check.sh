#!/bin/bash

# SNCRM系统健康检查脚本
# 用于检查系统各组件是否正常运行

echo "===== SNCRM系统健康检查 ====="
echo "检查时间: $(date)"
echo

# 检查PM2进程
echo "===== 检查PM2进程 ====="
if command -v pm2 &> /dev/null; then
    pm2 list | grep sncrm
    if [ $? -eq 0 ]; then
        echo "✅ PM2进程正在运行"
        
        # 检查内存使用情况
        MEMORY_USAGE=$(pm2 show sncrm | grep memory | awk '{print $4}')
        echo "   内存使用: $MEMORY_USAGE"
        
        # 检查运行时长
        UPTIME=$(pm2 show sncrm | grep uptime | awk '{print $4,$5,$6,$7}')
        echo "   运行时长: $UPTIME"
    else
        echo "❌ PM2进程未运行"
        echo "   尝试启动: pm2 start ecosystem.config.js"
    fi
else
    echo "❌ PM2未安装"
fi
echo

# 检查Nginx配置和运行状态
echo "===== 检查Nginx状态 ====="
if command -v nginx &> /dev/null; then
    NGINX_STATUS=$(systemctl status nginx | grep "Active:" | awk '{print $2}')
    if [ "$NGINX_STATUS" = "active" ]; then
        echo "✅ Nginx正在运行"
        
        # 检查配置文件
        if [ -f "/www/server/panel/vhost/nginx/crm.xinghun.info.conf" ]; then
            echo "✅ Nginx站点配置文件存在"
        else
            echo "❌ Nginx站点配置文件不存在"
        fi
        
        # 测试Nginx配置
        nginx -t 2>&1 | grep "successful"
        if [ $? -eq 0 ]; then
            echo "✅ Nginx配置测试通过"
        else
            echo "❌ Nginx配置测试失败"
        fi
    else
        echo "❌ Nginx未运行"
    fi
else
    echo "❌ Nginx未安装"
fi
echo

# 检查MySQL连接
echo "===== 检查MySQL连接 ====="
if [ -f "/usr/bin/mysql" ] || [ -f "/usr/local/bin/mysql" ]; then
    # 从环境变量中获取数据库配置
    DB_HOST="121.41.65.220"
    DB_PORT="3306"
    DB_USER="h5_cloud_user"
    DB_PASSWORD="mc72TNcMmy6HCybH"
    DB_NAME="h5_cloud_db"
    
    # 测试连接
    mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD -e "SELECT 1" $DB_NAME &>/dev/null
    if [ $? -eq 0 ]; then
        echo "✅ MySQL连接成功"
        
        # 获取数据库表数量
        TABLE_COUNT=$(mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME'" | tail -1)
        echo "   数据库表数量: $TABLE_COUNT"
    else
        echo "❌ MySQL连接失败"
    fi
else
    echo "❌ MySQL客户端未安装"
fi
echo

# 检查应用关键目录
echo "===== 检查应用目录 ====="
APP_DIR="/www/wwwroot/sncrm"
if [ -d "$APP_DIR" ]; then
    echo "✅ 应用目录存在: $APP_DIR"
    
    # 检查关键文件
    if [ -d "$APP_DIR/.next" ]; then
        echo "✅ Next.js构建目录存在"
    else
        echo "❌ Next.js构建目录不存在"
    fi
    
    if [ -d "$APP_DIR/.next/static" ]; then
        echo "✅ 静态资源目录存在"
    else
        echo "❌ 静态资源目录不存在"
    fi
    
    if [ -d "$APP_DIR/public" ]; then
        echo "✅ Public目录存在"
    else
        echo "❌ Public目录不存在"
    fi
    
    # 检查权限
    OWNER=$(ls -ld $APP_DIR | awk '{print $3}')
    if [ "$OWNER" = "www" ]; then
        echo "✅ 目录所有者正确: www"
    else
        echo "❌ 目录所有者不正确: $OWNER (应为www)"
    fi
else
    echo "❌ 应用目录不存在: $APP_DIR"
fi
echo

# 检查网络访问
echo "===== 检查网络访问 ====="
# 检查本地端口
if command -v netstat &> /dev/null; then
    LISTEN_3001=$(netstat -tln | grep ":3001")
    if [ -n "$LISTEN_3001" ]; then
        echo "✅ 应用正在监听3001端口"
    else
        echo "❌ 应用未监听3001端口"
    fi
else
    echo "❌ netstat工具未安装"
fi

# 检查HTTP访问
if command -v curl &> /dev/null; then
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001)
    if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "302" ]; then
        echo "✅ HTTP访问成功 (状态码: $HTTP_STATUS)"
    else
        echo "❌ HTTP访问失败 (状态码: $HTTP_STATUS)"
    fi
else
    echo "❌ curl工具未安装"
fi
echo

# 检查日志文件
echo "===== 检查日志文件 ====="
NGINX_ACCESS_LOG="/www/wwwlogs/sncrm.access.log"
NGINX_ERROR_LOG="/www/wwwlogs/sncrm.error.log"

if [ -f "$NGINX_ACCESS_LOG" ]; then
    echo "✅ Nginx访问日志存在"
    echo "   最近5条访问记录:"
    tail -5 $NGINX_ACCESS_LOG
else
    echo "❌ Nginx访问日志不存在"
fi

if [ -f "$NGINX_ERROR_LOG" ]; then
    echo "✅ Nginx错误日志存在"
    echo "   检查是否有错误:"
    ERROR_COUNT=$(grep -c "error" $NGINX_ERROR_LOG)
    echo "   错误数量: $ERROR_COUNT"
    if [ $ERROR_COUNT -gt 0 ]; then
        echo "   最近5条错误:"
        grep "error" $NGINX_ERROR_LOG | tail -5
    fi
else
    echo "❌ Nginx错误日志不存在"
fi
echo

echo "===== 健康检查完成 ====="
echo "如果发现问题，请查看检查报告并采取相应修复措施。" 