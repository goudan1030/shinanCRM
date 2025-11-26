# 服务器安装Chrome/Chromium指南

## 问题描述

PDF生成失败，错误信息显示找不到Chrome/Chromium浏览器。

## 解决方案

### 方案1：安装系统Chrome（推荐）

#### CentOS/RHEL系统
```bash
# 添加Google Chrome仓库
cat > /etc/yum.repos.d/google-chrome.repo <<EOF
[google-chrome]
name=google-chrome
baseurl=http://dl.google.com/linux/chrome/rpm/stable/x86_64
enabled=1
gpgcheck=1
gpgkey=https://dl.google.com/linux/linux_signing_key.pub
EOF

# 安装Chrome
yum install -y google-chrome-stable

# 验证安装
which google-chrome-stable
google-chrome-stable --version
```

#### Ubuntu/Debian系统
```bash
# 下载并安装Chrome
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
apt-get update
apt-get install -y ./google-chrome-stable_current_amd64.deb

# 验证安装
which google-chrome-stable
google-chrome-stable --version
```

#### 安装后设置环境变量
```bash
# 在 .env 或 .env.local 中添加
CHROME_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# 或者在启动脚本中设置
export CHROME_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
```

### 方案2：安装Chromium（轻量级）

#### CentOS/RHEL系统
```bash
# 安装EPEL仓库（如果还没有）
yum install -y epel-release

# 安装Chromium
yum install -y chromium
```

#### Ubuntu/Debian系统
```bash
apt-get update
apt-get install -y chromium-browser
```

#### 安装后设置环境变量
```bash
# 在 .env 或 .env.local 中添加
CHROME_EXECUTABLE_PATH=/usr/bin/chromium-browser
# 或者
CHROME_EXECUTABLE_PATH=/usr/bin/chromium
```

### 方案3：让Puppeteer自动下载Chrome

如果不想安装系统Chrome，可以让Puppeteer自动下载：

```bash
# 1. 确保环境变量未设置（如果设置了，先取消）
unset PUPPETEER_SKIP_DOWNLOAD

# 2. 重新安装puppeteer（如果需要）
npm install puppeteer

# 3. 手动触发下载（可选）
node -e "require('puppeteer').executablePath()"
```

注意：Puppeteer下载的Chrome会存储在 `~/.cache/puppeteer/` 目录下。

### 方案4：使用Docker镜像（如果使用Docker）

如果使用Docker部署，可以使用包含Chrome的镜像：

```dockerfile
FROM node:18

# 安装Chrome依赖
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# 设置环境变量
ENV CHROME_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
```

## 验证安装

```bash
# 检查Chrome是否安装
which google-chrome-stable
google-chrome-stable --version

# 或者检查Chromium
which chromium-browser
chromium-browser --version

# 测试无头模式
google-chrome-stable --headless --disable-gpu --dump-dom https://www.example.com
```

## 配置应用

安装完成后，在应用的环境变量中设置：

```bash
# .env 或 .env.local
CHROME_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
# 或者
CHROME_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

然后重启应用：
```bash
pm2 restart sncrm
```

## 常见问题

### 1. 权限问题
如果遇到权限问题，确保Chrome有执行权限：
```bash
chmod +x /usr/bin/google-chrome-stable
```

### 2. 依赖缺失
Chrome可能需要一些系统库，如果启动失败，安装依赖：
```bash
# CentOS/RHEL
yum install -y nss alsa-lib atk cups-libs gtk3 libXcomposite libXcursor libXdamage libXext libXi libXrandr libXScrnSaver libXtst pango

# Ubuntu/Debian
apt-get install -y libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2
```

### 3. 无头模式问题
如果Chrome在无头模式下无法启动，可能需要添加更多参数：
```bash
# 测试无头模式
google-chrome-stable --headless --no-sandbox --disable-gpu --dump-dom https://www.example.com
```

## 推荐方案

对于生产环境，推荐使用**方案1（安装系统Chrome）**，因为：
1. 更稳定可靠
2. 系统级管理，易于维护
3. 性能更好
4. 安全性更高

