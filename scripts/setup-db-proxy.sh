#!/bin/bash
# 数据库代理设置脚本
# 此脚本在MySQL服务器上运行，创建一个简单的代理服务

# 定义颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}   MySQL数据库代理设置工具   ${NC}"
echo -e "${BLUE}=========================================${NC}"

# 检查root权限
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}请使用root权限运行此脚本 (sudo ./setup-db-proxy.sh)${NC}"
  exit 1
fi

# 安装必要的工具
echo -e "\n${YELLOW}安装必要的工具...${NC}"
if command -v yum &> /dev/null; then
  # CentOS/RHEL/Amazon Linux
  yum update -y
  yum install -y nginx socat
elif command -v apt-get &> /dev/null; then
  # Debian/Ubuntu
  apt-get update
  apt-get install -y nginx socat
else
  echo -e "${RED}不支持的操作系统。请手动安装nginx和socat。${NC}"
  exit 1
fi

# 检查工具是否成功安装
if ! command -v nginx &> /dev/null || ! command -v socat &> /dev/null; then
  echo -e "${RED}工具安装失败。请手动安装nginx和socat。${NC}"
  exit 1
fi

# 获取服务器公网IP
SERVER_IP=$(curl -s ifconfig.me)
echo -e "\n${YELLOW}服务器公网IP: ${SERVER_IP}${NC}"

# 创建TCP代理服务
echo -e "\n${YELLOW}创建TCP代理服务...${NC}"

# 创建systemd服务文件
cat > /etc/systemd/system/mysql-proxy.service << EOF
[Unit]
Description=MySQL TCP Proxy
After=network.target

[Service]
ExecStart=/usr/bin/socat -d -d TCP-LISTEN:3307,fork TCP:127.0.0.1:3306
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# 重新加载systemd配置
systemctl daemon-reload

# 启动并启用代理服务
systemctl start mysql-proxy
systemctl enable mysql-proxy

# 检查代理服务状态
if systemctl is-active --quiet mysql-proxy; then
  echo -e "${GREEN}✓ MySQL代理服务已成功启动${NC}"
else
  echo -e "${RED}✗ MySQL代理服务启动失败${NC}"
  exit 1
fi

# 配置Nginx作为安全层
echo -e "\n${YELLOW}配置Nginx作为安全层...${NC}"

# 创建Nginx配置
cat > /etc/nginx/conf.d/mysql-proxy.conf << EOF
stream {
    server {
        listen 3308;
        proxy_connect_timeout 3s;
        proxy_timeout 10m;
        proxy_pass 127.0.0.1:3307;
    }
}
EOF

# 确保Nginx主配置文件包含stream模块
if ! grep -q "include /etc/nginx/conf.d/\*.conf;" /etc/nginx/nginx.conf; then
  # 添加include语句到http块之外
  sed -i '/http {/i include /etc/nginx/conf.d/*.conf;' /etc/nginx/nginx.conf
fi

# 检查Nginx配置
nginx -t
if [ $? -ne 0 ]; then
  echo -e "${RED}Nginx配置错误。请手动修复配置。${NC}"
  exit 1
fi

# 重启Nginx
systemctl restart nginx
systemctl enable nginx

# 检查Nginx状态
if systemctl is-active --quiet nginx; then
  echo -e "${GREEN}✓ Nginx服务已成功启动${NC}"
else
  echo -e "${RED}✗ Nginx服务启动失败${NC}"
  exit 1
fi

# 配置防火墙以允许代理端口
echo -e "\n${YELLOW}配置防火墙...${NC}"
if command -v firewall-cmd &> /dev/null; then
  # Firewalld
  firewall-cmd --permanent --add-port=3308/tcp
  firewall-cmd --reload
  echo -e "${GREEN}✓ 防火墙已配置允许3308端口${NC}"
elif command -v ufw &> /dev/null; then
  # UFW
  ufw allow 3308/tcp
  echo -e "${GREEN}✓ 防火墙已配置允许3308端口${NC}"
else
  # Iptables
  iptables -A INPUT -p tcp --dport 3308 -j ACCEPT
  if command -v iptables-save &> /dev/null; then
    iptables-save > /etc/iptables/rules.v4
  fi
  echo -e "${GREEN}✓ 防火墙已配置允许3308端口${NC}"
fi

# 检查阿里云安全组提示
echo -e "\n${YELLOW}重要提示：${NC}"
echo -e "如果您使用的是阿里云ECS，请确保在安全组中开放了3308端口。"
echo -e "请登录阿里云控制台，前往ECS安全组设置，添加允许3308端口的入站规则。"

# 总结
echo -e "\n${BLUE}=========================================${NC}"
echo -e "${GREEN}✓ MySQL数据库代理设置完成${NC}"
echo -e "${BLUE}=========================================${NC}"

echo -e "\n${YELLOW}代理信息:${NC}"
echo -e "服务器IP: ${SERVER_IP}"
echo -e "代理端口: 3308"
echo -e "MySQL连接字符串: mysql -h ${SERVER_IP} -P 3308 -u h5_cloud_user -p"

echo -e "\n${YELLOW}在Next.js应用程序中，使用以下数据库配置:${NC}"
echo -e "DB_HOST=${SERVER_IP}"
echo -e "DB_PORT=3308"
echo -e "DB_USER=h5_cloud_user"
echo -e "DB_PASSWORD=(您的密码)"
echo -e "DB_NAME=h5_cloud_db"

echo -e "\n${BLUE}感谢使用MySQL数据库代理设置工具!${NC}" 