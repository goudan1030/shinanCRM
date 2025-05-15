/**
 * 统一缓存管理器
 * 提供统一的缓存管理、监控和控制功能
 */
import { LRUCache } from 'lru-cache';

// 缓存配置接口
export interface CacheOptions {
  // 最大缓存项数量
  max?: number;
  // 缓存项过期时间（毫秒）
  ttl?: number;
  // 缓存命名空间
  namespace?: string;
  // 是否启用监控
  monitoring?: boolean;
  // 自动预热函数（可选）
  preloadFunction?: () => Promise<Record<string, any>>;
}

// 缓存统计信息接口
export interface CacheStats {
  // 缓存命名空间
  namespace: string;
  // 缓存大小（当前项数）
  size: number;
  // 缓存容量（最大项数）
  capacity: number;
  // 命中次数
  hits: number;
  // 未命中次数
  misses: number;
  // 命中率
  hitRate: number;
  // 已过期项目数
  expired: number;
}

/**
 * 缓存实例类
 * 管理单个命名空间的缓存
 */
class CacheInstance {
  private cache: LRUCache<string, any>;
  private namespace: string;
  private hits: number = 0;
  private misses: number = 0;
  private expired: number = 0;
  private preloadFunction?: () => Promise<Record<string, any>>;

  constructor(options: CacheOptions) {
    this.namespace = options.namespace || 'default';
    this.preloadFunction = options.preloadFunction;

    this.cache = new LRUCache({
      max: options.max || 1000,
      ttl: options.ttl || 1000 * 60 * 5, // 默认5分钟
      allowStale: false,
      updateAgeOnGet: true,
      dispose: (value, key) => {
        // 当项目被移除时触发
        if (this.cache.has(key) && this.cache.peek(key) === undefined) {
          this.expired++;
        }
      }
    });
  }

  /**
   * 获取缓存项
   * @param key 缓存键
   * @returns 缓存值或undefined
   */
  get<T>(key: string): T | undefined {
    const value = this.cache.get(key) as T | undefined;
    if (value === undefined) {
      this.misses++;
    } else {
      this.hits++;
    }
    return value;
  }

  /**
   * 设置缓存项
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 可选的特定TTL（毫秒）
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const options = ttl ? { ttl } : undefined;
    this.cache.set(key, value, options);
  }

  /**
   * 检查键是否存在
   * @param key 缓存键
   * @returns 是否存在
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * 删除缓存项
   * @param key 缓存键
   * @returns 是否成功删除
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
    this.resetStats();
  }

  /**
   * 重置统计数据
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.expired = 0;
  }

  /**
   * 获取缓存统计信息
   * @returns 缓存统计信息
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      namespace: this.namespace,
      size: this.cache.size,
      capacity: this.cache.max || 0,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      expired: this.expired
    };
  }

  /**
   * 预热缓存
   * 使用预加载函数填充缓存
   */
  async preload(): Promise<boolean> {
    if (!this.preloadFunction) {
      return false;
    }

    try {
      const data = await this.preloadFunction();
      for (const [key, value] of Object.entries(data)) {
        this.set(key, value);
      }
      return true;
    } catch (error) {
      console.error(`缓存预热失败 (${this.namespace}):`, error);
      return false;
    }
  }
}

/**
 * 缓存管理器类
 * 管理多个缓存实例，提供统一的操作接口
 */
class CacheManager {
  private instances: Map<string, CacheInstance> = new Map();
  private static instance: CacheManager;

  private constructor() {}

  /**
   * 获取缓存管理器实例（单例模式）
   * @returns 缓存管理器实例
   */
  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * 创建或获取缓存实例
   * @param options 缓存配置选项
   * @returns 缓存实例
   */
  public createCache(options: CacheOptions): CacheInstance {
    const namespace = options.namespace || 'default';
    if (!this.instances.has(namespace)) {
      this.instances.set(namespace, new CacheInstance(options));
    }
    return this.instances.get(namespace)!;
  }

  /**
   * 获取缓存实例
   * @param namespace 缓存命名空间
   * @returns 缓存实例或undefined
   */
  public getCache(namespace: string): CacheInstance | undefined {
    return this.instances.get(namespace);
  }

  /**
   * 删除缓存实例
   * @param namespace 缓存命名空间
   * @returns 是否成功删除
   */
  public deleteCache(namespace: string): boolean {
    return this.instances.delete(namespace);
  }

  /**
   * 清空所有缓存实例
   */
  public clearAllCaches(): void {
    for (const instance of this.instances.values()) {
      instance.clear();
    }
  }

  /**
   * 获取所有缓存实例的统计信息
   * @returns 所有缓存实例统计信息数组
   */
  public getAllStats(): CacheStats[] {
    const stats: CacheStats[] = [];
    for (const instance of this.instances.values()) {
      stats.push(instance.getStats());
    }
    return stats;
  }

  /**
   * 预热所有缓存
   * 为所有具有预加载函数的缓存实例执行预热操作
   */
  public async preloadAll(): Promise<void> {
    const preloadPromises: Promise<boolean>[] = [];
    for (const instance of this.instances.values()) {
      preloadPromises.push(instance.preload());
    }
    await Promise.all(preloadPromises);
  }
}

// 导出缓存管理器单例
export const cacheManager = CacheManager.getInstance();

// 辅助函数：创建带命名空间的缓存键
export function createCacheKey(namespace: string, ...parts: (string | number)[]): string {
  return `${namespace}:${parts.join(':')}`;
}

/**
 * 创建一个带缓存的函数
 * @param fn 原始函数
 * @param cacheInstance 缓存实例
 * @param keyGenerator 缓存键生成函数
 * @returns 带缓存的函数
 */
export function withCache<T, Args extends any[]>(
  fn: (...args: Args) => Promise<T>,
  cacheInstance: CacheInstance,
  keyGenerator: (...args: Args) => string
): (...args: Args) => Promise<T> {
  return async (...args: Args): Promise<T> => {
    const cacheKey = keyGenerator(...args);
    const cachedValue = cacheInstance.get<T>(cacheKey);
    
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    
    const result = await fn(...args);
    cacheInstance.set(cacheKey, result);
    return result;
  };
} 