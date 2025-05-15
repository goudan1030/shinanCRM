'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 通用数据刷新Hook
 * 
 * 提供优化的数据刷新机制，解决缓存导致的数据更新延迟问题。
 * 此Hook结合了路由刷新和延迟调用原有刷新函数的方法，
 * 确保在数据变更后能及时在界面上反映出来。
 */
export function useRefresh() {
  const router = useRouter();

  /**
   * 刷新数据
   * @param fetchFunction 原始获取数据的函数
   * @param delay 延迟时间（毫秒），默认300ms
   */
  const refreshData = useCallback((fetchFunction: () => void, delay: number = 300) => {
    // 立即刷新路由缓存
    router.refresh();
    
    // 延迟一点时间后调用原始数据获取函数
    // 确保后端数据更新已经生效，并能获取到最新数据
    setTimeout(() => {
      fetchFunction();
    }, delay);
  }, [router]);

  /**
   * 为请求添加防缓存头信息和时间戳
   * @param url 原始请求URL
   * @param options 请求选项
   * @returns 增强后的请求选项
   */
  const createNoCacheRequest = useCallback((url: string, options: RequestInit = {}) => {
    // 添加时间戳参数
    const urlWithTimestamp = url.includes('?') 
      ? `${url}&_t=${Date.now()}` 
      : `${url}?_t=${Date.now()}`;
    
    // 添加防缓存头
    const enhancedOptions: RequestInit = {
      ...options,
      headers: {
        ...options.headers,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    };
    
    return { url: urlWithTimestamp, options: enhancedOptions };
  }, []);

  return { refreshData, createNoCacheRequest };
} 