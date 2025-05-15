/**
 * 缓存服务模块
 * 提供缓存的初始化、预热和管理功能
 */
import { cacheManager, createCacheKey } from './cache-manager';
import { allCacheStrategies } from './cache-strategies';

// 缓存服务初始化状态
let isInitialized = false;

/**
 * 初始化缓存服务
 * 创建所有预定义的缓存实例
 */
export async function initCacheService(): Promise<void> {
  if (isInitialized) {
    console.log('缓存服务已初始化，跳过');
    return;
  }

  console.log('初始化缓存服务...');
  for (const strategy of allCacheStrategies) {
    cacheManager.createCache(strategy);
  }
  
  isInitialized = true;
  console.log('缓存服务初始化完成');
}

/**
 * 预热所有缓存
 * 执行所有缓存的预热功能
 */
export async function preloadAllCaches(): Promise<void> {
  if (!isInitialized) {
    await initCacheService();
  }
  
  console.log('开始预热所有缓存...');
  await cacheManager.preloadAll();
  console.log('缓存预热完成');
}

/**
 * 获取缓存统计信息
 * @returns 所有缓存的统计信息
 */
export function getCacheStats() {
  if (!isInitialized) {
    return [];
  }
  
  return cacheManager.getAllStats();
}

/**
 * 清空特定命名空间的缓存
 * @param namespace 缓存命名空间
 * @returns 是否成功清空
 */
export function clearNamespaceCache(namespace: string): boolean {
  const cache = cacheManager.getCache(namespace);
  if (!cache) {
    return false;
  }
  
  cache.clear();
  return true;
}

/**
 * 清空所有缓存
 */
export function clearAllCaches(): void {
  cacheManager.clearAllCaches();
}

/**
 * 重新预热特定缓存
 * @param namespace 缓存命名空间
 * @returns 是否成功预热
 */
export async function reloadNamespaceCache(namespace: string): Promise<boolean> {
  const cache = cacheManager.getCache(namespace);
  if (!cache) {
    return false;
  }
  
  return await cache.preload();
}

/**
 * 检查系统缓存健康状态
 * @returns 缓存健康状态信息
 */
export function checkCacheHealth() {
  const stats = getCacheStats();
  
  // 计算总命中率和平均命中率
  let totalHits = 0;
  let totalMisses = 0;
  let lowHitRateCaches: string[] = [];
  
  for (const stat of stats) {
    totalHits += stat.hits;
    totalMisses += stat.misses;
    
    // 检查命中率低的缓存 (低于50%)
    if (stat.hits + stat.misses > 100 && stat.hitRate < 0.5) {
      lowHitRateCaches.push(stat.namespace);
    }
  }
  
  const totalRequests = totalHits + totalMisses;
  const globalHitRate = totalRequests > 0 ? totalHits / totalRequests : 0;
  
  return {
    isHealthy: globalHitRate >= 0.7, // 命中率70%以上认为健康
    globalHitRate,
    totalCaches: stats.length,
    totalHits,
    totalMisses,
    lowHitRateCaches,
    recommendations: lowHitRateCaches.length > 0
      ? `考虑优化以下缓存的策略: ${lowHitRateCaches.join(', ')}`
      : '所有缓存命中率正常'
  };
}

// 导出辅助函数和钩子
export { createCacheKey, cacheManager };

// 立即初始化缓存服务 (仅在生产环境)
if (process.env.NODE_ENV === 'production') {
  // 使用setTimeout避免阻塞启动过程
  setTimeout(async () => {
    try {
      await initCacheService();
      await preloadAllCaches();
    } catch (error) {
      console.error('缓存服务自动初始化失败:', error);
    }
  }, 2000);
} 