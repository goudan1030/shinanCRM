/**
 * 无缓存Fetch工具函数
 * 
 * 后台管理系统专用，所有数据请求都不使用缓存，确保数据实时性
 */

/**
 * 创建无缓存请求配置
 * @param url 请求URL
 * @param options 原始请求选项
 * @returns 增强后的请求选项（包含无缓存配置）
 */
export function createNoCacheFetchOptions(
  url: string,
  options: RequestInit = {}
): { url: string; options: RequestInit } {
  // 添加时间戳参数，确保每次请求都是唯一的
  const urlWithTimestamp = url.includes('?') 
    ? `${url}&_t=${Date.now()}` 
    : `${url}?_t=${Date.now()}`;
  
  // 创建无缓存请求选项
  const noCacheOptions: RequestInit = {
    ...options,
    cache: 'no-store', // Next.js fetch API的缓存控制
    credentials: 'include', // 确保发送cookie
    headers: {
      ...options.headers,
      'Cache-Control': 'no-cache, no-store, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    }
  };
  
  return { url: urlWithTimestamp, options: noCacheOptions };
}

/**
 * 无缓存Fetch函数
 * 这是fetch的包装函数，自动添加无缓存配置
 * 
 * @param url 请求URL
 * @param options 请求选项
 * @returns Promise<Response>
 */
export async function fetchNoCache(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const { url: finalUrl, options: finalOptions } = createNoCacheFetchOptions(url, options);
  return fetch(finalUrl, finalOptions);
}

