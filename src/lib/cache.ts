/**
 * 缓存工具库 - 实现简单的LRU缓存来提高频繁查询的性能
 */

type CacheItem<T> = {
  value: T;
  expiry: number;
};

class Cache<T = any> {
  private cache: Map<string, CacheItem<T>>;
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize = 100, defaultTTL = 60000) { // 默认1分钟过期
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  // 获取缓存项
  get(key: string): T | undefined {
    const item = this.cache.get(key);
    
    // 如果项目不存在或已过期，返回undefined
    if (!item || Date.now() > item.expiry) {
      if (item) this.cache.delete(key); // 删除过期项
      return undefined;
    }
    
    // 访问后移动到"最近使用"位置
    this.cache.delete(key);
    this.cache.set(key, item);
    
    return item.value;
  }

  // 设置缓存项
  set(key: string, value: T, ttl = this.defaultTTL): void {
    // 如果缓存已满，删除最旧的项（Map的第一个项）
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl,
    });
  }

  // 检查键是否存在且未过期
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item || Date.now() > item.expiry) {
      if (item) this.cache.delete(key);
      return false;
    }
    return true;
  }

  // 删除缓存项
  delete(key: string): void {
    this.cache.delete(key);
  }

  // 清空所有缓存
  clear(): void {
    this.cache.clear();
  }

  // 获取当前缓存大小
  size(): number {
    return this.cache.size;
  }

  // 获取所有未过期的键
  keys(): string[] {
    const now = Date.now();
    const keys: string[] = [];
    
    for (const [key, item] of this.cache.entries()) {
      if (now <= item.expiry) {
        keys.push(key);
      } else {
        this.cache.delete(key);
      }
    }
    
    return keys;
  }
}

// 创建缓存实例，用于会员数据
export const membersCache = new Cache<any>(200, 5 * 60 * 1000); // 5分钟过期

// 创建缓存实例，用于仪表板数据
export const dashboardCache = new Cache<any>(50, 10 * 60 * 1000); // 10分钟过期

// 创建缓存实例，用于系统配置数据
export const configCache = new Cache<any>(20, 30 * 60 * 1000); // 30分钟过期

// 创建缓存实例，用于常用查询
export const queryCache = new Cache<any>(500, 2 * 60 * 1000); // 2分钟过期

/**
 * 通用缓存获取函数 - 如果数据在缓存中，返回缓存数据，否则执行提供的fetcher获取数据并缓存
 * @param cache 缓存实例
 * @param key 缓存键
 * @param fetcher 获取数据的函数
 * @param ttl 自定义缓存过期时间(毫秒)
 */
export async function getFromCache<T>(
  cache: Cache<T>,
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // 检查缓存
  const cachedData = cache.get(key);
  if (cachedData !== undefined) {
    console.log(`缓存命中: ${key}`);
    return cachedData;
  }

  // 缓存未命中，获取新数据
  console.log(`缓存未命中: ${key}`);
  try {
    const data = await fetcher();
    cache.set(key, data, ttl);
    return data;
  } catch (error) {
    console.error(`获取数据失败: ${key}`, error);
    throw error;
  }
}

// 默认导出缓存实例和工具
export default {
  membersCache,
  dashboardCache,
  configCache,
  queryCache,
  getFromCache
}; 