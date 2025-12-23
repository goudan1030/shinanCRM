// 字体配置 - 使用系统字体以避免构建时网络请求失败
// 由于服务器可能无法访问 Google Fonts，直接使用系统字体

// 使用系统字体变量，不依赖 Google Fonts
export const geistSans = {
  variable: '--font-geist-sans',
};

export const geistMono = {
  variable: '--font-geist-mono',
};

// 组合所有字体变量
export const fontVariables = [
  geistSans.variable, 
  geistMono.variable,
].filter(Boolean).join(' '); 