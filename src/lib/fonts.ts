import { Geist, Geist_Mono } from "next/font/google";
// 移除本地字体导入，因为字体文件不存在

// 优化 Google Fonts 加载
export const geistSans = Geist({
  subsets: ['latin'],
  display: 'swap', // 文本在字体加载前使用系统字体显示
  preload: true,   // 预加载字体
  fallback: ['system-ui', 'sans-serif'], // 回退字体
  adjustFontFallback: true, // 自动调整回退字体以减少布局偏移
  variable: '--font-geist-sans',
});

export const geistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  fallback: ['Consolas', 'monospace'],
  adjustFontFallback: true,
  variable: '--font-geist-mono',
});

// 组合所有字体变量供全v a
export const fontVariables = [
  geistSans.variable, 
  geistMono.variable,
].join(' '); 