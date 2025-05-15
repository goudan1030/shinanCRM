#!/usr/bin/env node

/**
 * 图片资源优化脚本
 * 
 * 该脚本用于优化项目中的图片资源：
 * 1. 压缩JPG和PNG图片
 * 2. 转换图片为WebP和AVIF格式
 * 3. 生成不同尺寸的响应式图片
 */

const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const glob = require('glob');
const chalk = require('chalk');
const { mkdirp } = require('mkdirp');

// 配置项
const config = {
  // 源图片目录
  inputDir: 'public/images',
  // 输出目录
  outputDir: 'public/static/images',
  // 生成的尺寸
  sizes: [640, 750, 828, 1080, 1200, 1920],
  // 质量设置
  quality: {
    jpeg: 80,
    webp: 75,
    avif: 60,
  },
  // 是否生成WebP
  generateWebP: true,
  // 是否生成AVIF (AVIF压缩率高但支持的浏览器较少)
  generateAVIF: true,
  // 是否保留原始图片
  keepOriginal: true,
};

// 确保输出目录存在
async function ensureOutputDir() {
  await mkdirp(config.outputDir);
  console.log(chalk.blue(`✓ 输出目录已创建: ${config.outputDir}`));
}

// 获取所有图片
async function getImageFiles() {
  return new Promise((resolve, reject) => {
    glob(`${config.inputDir}/**/*.{jpg,jpeg,png}`, (err, files) => {
      if (err) return reject(err);
      resolve(files);
    });
  });
}

// 处理单个图片
async function processImage(imagePath) {
  const filename = path.basename(imagePath, path.extname(imagePath));
  const outputPath = path.join(config.outputDir, filename);
  
  // 创建文件夹
  await mkdirp(outputPath);
  
  // 加载图片
  const image = sharp(imagePath);
  const metadata = await image.metadata();
  
  const tasks = [];
  
  // 保留原始图片
  if (config.keepOriginal) {
    const originalOutput = path.join(outputPath, `original${path.extname(imagePath)}`);
    tasks.push(
      image
        .jpeg({ quality: config.quality.jpeg })
        .toFile(originalOutput)
        .then(() => console.log(chalk.green(`✓ 优化原始图片: ${originalOutput}`)))
    );
  }
  
  // 生成不同尺寸的图片
  for (const size of config.sizes) {
    // 如果原图比指定尺寸小，则跳过
    if (size > metadata.width) continue;
    
    // 处理JPEG
    const jpegOutput = path.join(outputPath, `${size}.jpg`);
    tasks.push(
      image
        .resize(size)
        .jpeg({ quality: config.quality.jpeg })
        .toFile(jpegOutput)
        .then(() => console.log(chalk.green(`✓ 生成JPEG ${size}px: ${jpegOutput}`)))
    );
    
    // 处理WebP
    if (config.generateWebP) {
      const webpOutput = path.join(outputPath, `${size}.webp`);
      tasks.push(
        image
          .resize(size)
          .webp({ quality: config.quality.webp })
          .toFile(webpOutput)
          .then(() => console.log(chalk.green(`✓ 生成WebP ${size}px: ${webpOutput}`)))
      );
    }
    
    // 处理AVIF
    if (config.generateAVIF) {
      const avifOutput = path.join(outputPath, `${size}.avif`);
      tasks.push(
        image
          .resize(size)
          .avif({ quality: config.quality.avif })
          .toFile(avifOutput)
          .then(() => console.log(chalk.green(`✓ 生成AVIF ${size}px: ${avifOutput}`)))
      );
    }
  }
  
  // 等待所有任务完成
  await Promise.all(tasks);
  console.log(chalk.blue(`✓ 图片 ${filename} 处理完成`));
}

// 主函数
async function main() {
  try {
    console.log(chalk.blue('开始优化图片资源...'));
    
    // 确保输出目录存在
    await ensureOutputDir();
    
    // 获取所有图片
    const imageFiles = await getImageFiles();
    console.log(chalk.blue(`找到 ${imageFiles.length} 个图片文件`));
    
    // 处理每个图片
    for (const imagePath of imageFiles) {
      await processImage(imagePath);
    }
    
    console.log(chalk.green.bold('✓ 所有图片优化完成!'));
  } catch (error) {
    console.error(chalk.red('图片优化过程中出错:'), error);
    process.exit(1);
  }
}

// 运行主函数
main(); 