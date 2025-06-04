# SNCRM 阿里云部署指南

本文档提供了将 SNCRM 部署到阿里云服务器的详细步骤和最佳实践。

## 目录

1. [部署准备](#部署准备)
2. [环境设置](#环境设置)
3. [部署方式](#部署方式)
   - [方式一：标准部署](#方式一标准部署)
   - [方式二：宝塔面板部署](#方式二宝塔面板部署)
4. [数据库配置](#数据库配置)
5. [HTTPS 配置](#https-配置)
6. [维护与更新](#维护与更新)
7. [常见问题](#常见问题)

## 部署准备

### 阿里云服务器要求

- ECS云服务器（建议2核4GB以上配置）
- 操作系统：CentOS 7+ 或 Ubuntu 18.04+
- 带宽：建议5Mbps以上
- 存储：50GB以上

### 域名与备案

如果您计划使用自定义域名，请确保：
- 已在阿里云购买域名
- 已完成ICP备案（中国大陆服务器必须）
- 已将域名解析到服务器IP

### 本地环境要求

- Git
- Node.js (v16+)
- npm 或 yarn
- SSH客户端
- rsync (用于文件传输)

## 环境设置

### 方式一：手动安装环境

在阿里云服务器上依次安装以下软件：

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y   # Ubuntu
# 或
sudo yum update -y                       # CentOS

# 安装Node.js
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs               # Ubuntu
# 或
sudo yum install -y nodejs               # CentOS

# 安装PM2
sudo npm install -g pm2

# 安装Nginx
sudo apt install -y nginx                # Ubuntu
# 或
sudo yum install -y nginx                # CentOS
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 方式二：使用宝塔面板

1. 安装宝塔面板：
   ```bash
   # Ubuntu
   wget -O install.sh http://download.bt.cn/install/install-ubuntu_6.0.sh && bash install.sh
   
   # CentOS
   yum install -y wget && wget -O install.sh http://download.bt.cn/install/install_6.0.sh && bash install.sh
   ```

2. 通过宝塔面板安装：
   - Nginx
   - Node.js
   - MySQL
   - PM2管理器

## 部署方式

### 方式一：标准部署

我们提供了自动化部署脚本，简化部署流程：

1. 修改配置：打开 `scripts/deploy-to-aliyun.sh`，设置以下变量：
   ```bash
   SERVER_IP="您的服务器IP"
   SERVER_USER="root"
   SERVER_PATH="/var/www/sncrm"
   SSH_KEY="~/.ssh/id_rsa"  # 如使用密码认证，设置为空
   ```

2. 赋予脚本执行权限：
   ```bash
   chmod +x scripts/deploy-to-aliyun.sh
   ```

3. 执行部署脚本：
   ```bash
   ./scripts/deploy-to-aliyun.sh
   ```

### 方式二：宝塔面板部署

如果您使用宝塔面板，请使用专用部署脚本：

1. 修改配置：打开 `scripts/deploy-with-bt.sh`，设置以下变量：
   ```bash
   SERVER_IP="您的服务器IP"
   SERVER_USER="root"
   SERVER_PATH="/www/wwwroot/sncrm"  # 宝塔默认网站目录
   SSH_KEY="~/.ssh/id_rsa"  # 如使用密码认证，设置为空
   ```

2. 赋予脚本执行权限：
   ```bash
   chmod +x scripts/deploy-with-bt.sh
   ```

3. 执行部署脚本：
   ```bash
   ./scripts/deploy-with-bt.sh
   ```

4. 在宝塔面板中配置网站：
   - 创建网站，绑定域名
   - 网站目录设为 `/www/wwwroot/sncrm`
   - 在"设置"中配置反向代理：
     - 目标URL: `http://127.0.0.1:3000`
     - 发送域名: `$host`

## 数据库配置

SNCRM 默认使用阿里云MySQL数据库。确保在服务器上正确配置数据库连接：

1. 在服务器上创建 `.env.local` 文件：
   ```bash
   cd /var/www/sncrm  # 或您设置的部署路径
   nano .env.local
   ```

2. 添加以下内容（替换为您的实际配置）：
   ```
   # 数据库配置
   DB_HOST=您的MySQL主机地址
   DB_PORT=3306
   DB_USER=您的MySQL用户名
   DB_PASSWORD=您的MySQL密码
   DB_NAME=您的数据库名
   
   # JWT配置
   JWT_SECRET=生成安全的随机字符串
   
   # 服务器配置
   SERVER_URL=http://您的域名/
   ```

3. 保存并退出

### 使用SSH隧道连接阿里云RDS（可选）

如果您的MySQL数据库启用了SSH隧道访问：

1. 在服务器上创建隧道脚本：
   ```bash
   cd /var/www/sncrm
   nano scripts/setup-db-tunnel.sh
   ```

2. 添加以下内容（替换为您的实际配置）：
   ```bash
   #!/bin/bash
   
   # 启动SSH隧道
   ssh -N -L 3306:rm-xxx.mysql.rds.aliyuncs.com:3306 user@jumpserver -p 22
   ```

3. 设置权限并运行：
   ```bash
   chmod +x scripts/setup-db-tunnel.sh
   nohup ./scripts/setup-db-tunnel.sh &
   ```

## HTTPS 配置

### 方式一：手动配置

1. 获取SSL证书（可通过阿里云SSL证书服务）

2. 上传证书到服务器：
   ```bash
   # 创建证书目录
   sudo mkdir -p /etc/nginx/ssl/sncrm

   # 上传证书（在本地执行）
   scp cert.pem user@your-server:/etc/nginx/ssl/sncrm/
   scp key.pem user@your-server:/etc/nginx/ssl/sncrm/
   ```

3. 配置Nginx：
   ```bash
   sudo nano /etc/nginx/sites-available/sncrm
   ```
   
   添加以下内容：
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       return 301 https://$host$request_uri;
   }
   
   server {
       listen 443 ssl;
       server_name your-domain.com;
       
       ssl_certificate /etc/nginx/ssl/sncrm/cert.pem;
       ssl_certificate_key /etc/nginx/ssl/sncrm/key.pem;
       ssl_protocols TLSv1.2 TLSv1.3;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

4. 重启Nginx：
   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### 方式二：宝塔面板配置

1. 在宝塔面板中打开网站设置
2. 点击"SSL"选项卡
3. 选择"Let's Encrypt"或上传自己的证书
4. 启用"强制HTTPS"选项
5. 保存设置

## 维护与更新

### 查看日志

查看PM2日志：
```bash
pm2 logs sncrm
```

查看Nginx日志：
```bash
# 标准部署
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# 宝塔面板
tail -f /www/wwwlogs/your-domain.com.log
```

### 更新应用

重新运行部署脚本即可更新应用：
```bash
./scripts/deploy-to-aliyun.sh
# 或
./scripts/deploy-with-bt.sh
```

### 监控与重启

使用PM2监控应用：
```bash
pm2 monit
```

重启应用：
```bash
pm2 restart sncrm
```

## 常见问题

### 应用无法启动

1. 检查日志：
   ```bash
   pm2 logs sncrm
   ```

2. 检查Node.js版本：
   ```bash
   node -v
   ```

3. 检查环境变量：
   ```bash
   cat .env.local
   ```

### 数据库连接失败

1. 检查数据库连接信息是否正确
2. 确认服务器防火墙是否允许数据库连接
3. 检查MySQL服务是否运行：
   ```bash
   # 标准部署
   sudo systemctl status mysql
   
   # 宝塔面板
   bt mysql status
   ```

### 502 Bad Gateway错误

1. 检查Node.js应用是否正在运行：
   ```bash
   pm2 list
   ```

2. 检查Nginx配置：
   ```bash
   # 标准部署
   sudo nginx -t
   
   # 宝塔面板
   在面板中检查网站设置
   ```

3. 检查端口是否被占用：
   ```bash
   netstat -tulpn | grep 3000
   ```

### 性能优化建议

1. 启用Nginx缓存：
   ```nginx
   # 在nginx配置中添加
   location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
       expires 30d;
       add_header Cache-Control "public, no-transform";
   }
   ```

2. 启用PM2集群模式：
   ```bash
   pm2 delete sncrm
   pm2 start npm --name 'sncrm' -i max -- start
   pm2 save
   ```

3. 定期清理日志：
   ```bash
   pm2 flush
   ```

---

如有更多问题，请联系技术支持团队。 