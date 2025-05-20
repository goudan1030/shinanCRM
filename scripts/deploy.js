/**
 * 部署辅助脚本
 * 确保静态资源正确复制到发布目录
 */

const fs = require('fs-extra');
const path = require('path');

// 复制public目录到发布目录
async function copyPublicFiles() {
  console.log('正在复制静态资源文件...');
  try {
    // 确保目标目录存在
    await fs.ensureDir(path.join(process.cwd(), '.next/static'));
    
    // 复制logo.svg到多个位置以确保访问
    await fs.copy(
      path.join(process.cwd(), 'public/logo.svg'),
      path.join(process.cwd(), '.next/static/logo.svg')
    );
    
    // 同时复制到根目录
    await fs.copy(
      path.join(process.cwd(), 'public/logo.svg'),
      path.join(process.cwd(), '.next/logo.svg')
    );
    
    // 复制其他SVG文件
    const svgFiles = await fs.readdir(path.join(process.cwd(), 'public'));
    for (const file of svgFiles) {
      if (file.endsWith('.svg')) {
        await fs.copy(
          path.join(process.cwd(), `public/${file}`),
          path.join(process.cwd(), `.next/${file}`)
        );
      }
    }
    
    console.log('✅ 静态资源文件复制完成');
  } catch (error) {
    console.error('❌ 复制静态资源文件失败:', error);
  }
}

// 执行部署任务
async function deploy() {
  try {
    await copyPublicFiles();
    
    // 创建netlify专用的_redirects文件确保资源可访问
    const redirectsContent = `
# 确保静态资源可访问
/logo.svg /logo.svg 200
/_next/* /_next/:splat 200
/* /index.html 200
`;
    
    await fs.writeFile(path.join(process.cwd(), '.next/_redirects'), redirectsContent);
    console.log('✅ 部署准备完成');
  } catch (error) {
    console.error('❌ 部署准备失败:', error);
    process.exit(1);
  }
}

// 执行部署
deploy(); 