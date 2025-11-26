# 服务器安装Chrome/Chromium指南

## 问题描述

PDF生成失败，错误信息显示找不到Chrome/Chromium浏览器。

## 第一步：查看你的系统类型

在服务器上执行以下命令，确定你的系统类型：

```bash
# 查看系统信息
cat /etc/os-release

# 或者查看发行版
cat /etc/redhat-release  # CentOS/RHEL
cat /etc/debian_version  # Debian
lsb_release -a           # Ubuntu/Debian（如果安装了lsb-release）
```

根据输出结果：
- 如果看到 `CentOS`、`Red Hat`、`RHEL`、`Rocky`、`AlmaLinux` → 使用 **CentOS/RHEL 方案**
- 如果看到 `Ubuntu`、`Debian` → 使用 **Ubuntu/Debian 方案**

## 第二步：根据你的系统选择安装步骤

---

## CentOS/RHEL 系统安装步骤

### 安装Chrome（推荐）
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

---

## Ubuntu/Debian 系统安装步骤

### 安装Chrome（推荐）
```bash
# 下载并安装Chrome
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
apt-get update
apt-get install -y ./google-chrome-stable_current_amd64.deb

# 验证安装
which google-chrome-stable
google-chrome-stable --version
```

---

## 第三步：配置应用

安装完成后，设置环境变量并重启应用：

```bash
# 1. 找到Chrome的安装路径
which google-chrome-stable
# 通常输出：/usr/bin/google-chrome-stable

# 2. 在项目根目录的 .env 或 .env.local 文件中添加：
CHROME_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# 3. 重启应用
pm2 restart sncrm
```

---

## 其他方案（如果上述方案不行）

### 方案A：安装Chromium（轻量级替代）

**CentOS/RHEL:**
```bash
yum install -y epel-release
yum install -y chromium
# 然后设置：CHROME_EXECUTABLE_PATH=/usr/bin/chromium
```

**Ubuntu/Debian:**
```bash
apt-get update
apt-get install -y chromium-browser
# 然后设置：CHROME_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### 方案B：让Puppeteer自动下载

```bash
# 在项目目录执行
unset PUPPETEER_SKIP_DOWNLOAD
npm install puppeteer
pm2 restart sncrm
```

## 验证安装是否成功

```bash
# 检查Chrome是否安装
which google-chrome-stable
google-chrome-stable --version

# 测试无头模式（可选）
google-chrome-stable --headless --no-sandbox --disable-gpu --dump-dom https://www.example.com
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

### 3. 如果安装后还是报错

检查Chrome是否能正常启动：
```bash
# 测试Chrome
google-chrome-stable --headless --no-sandbox --disable-gpu --version

# 如果报错缺少依赖，安装依赖库
# CentOS/RHEL:
yum install -y nss alsa-lib atk cups-libs gtk3 libXcomposite libXcursor libXdamage libXext libXi libXrandr libXScrnSaver libXtst pango

# Ubuntu/Debian:
apt-get install -y libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2
```

