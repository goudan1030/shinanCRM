/**
 * Netlify部署修复脚本
 * 解决Netlify部署中的静态资源路径问题
 */

const fs = require('fs-extra');
const path = require('path');

// 目标文件和目录
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const NEXT_DIR = path.join(process.cwd(), '.next');
const STATIC_DIR = path.join(NEXT_DIR, 'static');

async function createNetlifyToml() {
  const netlifyTomlContent = `
# Netlify配置 - 自动生成
[build]
  publish = ".next"
  command = "npm run build"

[[plugins]]
  package = "@netlify/plugin-nextjs"

# 静态资源处理规则
[[redirects]]
  from = "/logo.svg"
  to = "/logo.svg"
  status = 200
  force = true

[[redirects]]
  from = "/*.svg"
  to = "/:splat"
  status = 200

[[redirects]]
  from = "/_next/*"
  to = "/_next/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
  
# 缓存配置
[[headers]]
  for = "/*.svg"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
`;

  await fs.writeFile(path.join(process.cwd(), 'netlify.toml'), netlifyTomlContent, 'utf8');
  console.log('✅ netlify.toml 配置文件已更新');
}

async function fixStaticFiles() {
  try {
    // 1. 确保目标目录存在
    await fs.ensureDir(STATIC_DIR);
    
    // 2. 复制所有SVG文件到多个位置
    const svgFiles = await fs.readdir(PUBLIC_DIR);
    
    for (const file of svgFiles) {
      if (file.endsWith('.svg')) {
        const sourcePath = path.join(PUBLIC_DIR, file);
        
        // 复制到.next根目录
        await fs.copy(sourcePath, path.join(NEXT_DIR, file));
        console.log(`✅ 已复制 ${file} 到 .next/${file}`);
        
        // 复制到static目录
        await fs.copy(sourcePath, path.join(STATIC_DIR, file));
        console.log(`✅ 已复制 ${file} 到 .next/static/${file}`);
        
        // 也复制到静态资源目录下的其他可能位置
        await fs.copy(sourcePath, path.join(NEXT_DIR, `static/media/${file}`));
        console.log(`✅ 已复制 ${file} 到 .next/static/media/${file}`);
      }
    }
    
    // 3. 创建_redirects文件，用于Netlify
    const redirectsContent = `
# 静态资源路径修复
/logo.svg /logo.svg 200
/*.svg /:splat 200
/_next/* /_next/:splat 200
/*  /index.html 200
`;
    
    await fs.writeFile(path.join(NEXT_DIR, '_redirects'), redirectsContent);
    console.log('✅ _redirects 文件已创建');
    
    return true;
  } catch (error) {
    console.error('❌ 修复静态文件失败:', error);
    return false;
  }
}

async function main() {
  console.log('🔧 开始修复Netlify部署问题...');
  
  // 更新netlify.toml配置
  await createNetlifyToml();
  
  // 修复静态文件
  const fixResult = await fixStaticFiles();
  
  if (fixResult) {
    console.log('✅ Netlify部署修复完成，静态资源应该可以正常访问了');
  } else {
    console.error('❌ Netlify部署修复失败，请手动检查问题');
    process.exit(1);
  }
}

// 执行主函数
main(); 