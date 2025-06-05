#!/bin/bash

# 修复TailwindCSS问题的脚本
echo "开始修复TailwindCSS问题..."

# 设置变量
SERVER_IP="8.149.244.105"
SERVER_USER="root"

# 远程执行命令
ssh $SERVER_USER@$SERVER_IP << 'EOT'
# 进入项目目录
cd /www/wwwroot/sncrm_new

# 确保TailwindCSS正确安装
echo "重新安装TailwindCSS及其依赖..."
npm install -D tailwindcss postcss autoprefixer

# 初始化Tailwind配置
echo "初始化Tailwind配置..."
npx tailwindcss init -p

# 更新Tailwind配置
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF

# 创建styles目录和全局CSS文件
echo "创建样式文件..."
mkdir -p styles
cat > styles/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}

body {
  color: rgb(var(--foreground-rgb));
  background: white;
}
EOF

# 创建正确的_app.tsx文件
echo "创建_app.tsx文件..."
cat > pages/_app.tsx << 'EOF'
import '../styles/globals.css';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
EOF

# 修改postcss.config.js
echo "修改PostCSS配置..."
cat > postcss.config.js << 'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

# 重新构建项目
echo "重新构建项目..."
npm run build

# 如果构建成功，创建一个标记文件
if [ $? -eq 0 ]; then
  echo "SUCCESS" > build_success
  echo "TailwindCSS问题修复完成，构建成功。"
  echo "现在可以运行 deploy.sh 脚本部署系统。"
else
  echo "构建失败，请检查日志。"
fi
EOT

echo "TailwindCSS修复脚本已运行。"
if ssh $SERVER_USER@$SERVER_IP "[ -f /www/wwwroot/sncrm_new/build_success ]"; then
  echo "构建成功！请连接到服务器并运行 /www/wwwroot/sncrm_new/deploy.sh 进行部署。"
else
  echo "构建失败，请检查日志并修复错误。"
fi 