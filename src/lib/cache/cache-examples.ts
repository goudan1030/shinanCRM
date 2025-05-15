/**
 * 缓存使用示例
 * 展示如何在不同场景中使用缓存系统
 */
import { RowDataPacket } from 'mysql2';
import pool from '../database';
import { cacheManager, createCacheKey } from './cache-manager';
import { withCache } from './cache-manager';
import { membersCacheStrategy, dashboardCacheStrategy } from './cache-strategies';

// 确保缓存已创建
const membersCache = cacheManager.createCache(membersCacheStrategy);
const dashboardCache = cacheManager.createCache(dashboardCacheStrategy);

/**
 * 示例1: 使用缓存获取会员信息
 * 适用于API路由和服务器组件
 */
export async function getMemberById(memberId: number) {
  // 创建缓存键
  const cacheKey = createCacheKey('members', 'member', memberId.toString());
  
  // 检查缓存中是否存在
  const cachedMember = membersCache.get<RowDataPacket>(cacheKey);
  if (cachedMember) {
    console.log(`缓存命中: 会员ID=${memberId}`);
    return cachedMember;
  }
  
  // 缓存未命中，从数据库获取
  console.log(`缓存未命中: 会员ID=${memberId}, 从数据库获取`);
  const [members] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM members WHERE id = ?',
    [memberId]
  );
  
  if (members.length === 0) {
    return null;
  }
  
  const member = members[0];
  
  // 存入缓存
  membersCache.set(cacheKey, member);
  
  return member;
}

/**
 * 示例2: 使用withCache函数简化缓存逻辑
 * 使用高阶函数自动处理缓存逻辑
 */
export const getMemberByEmail = withCache(
  // 原始函数
  async (email: string) => {
    const [members] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM members WHERE email = ?',
      [email]
    );
    return members.length > 0 ? members[0] : null;
  },
  // 使用的缓存实例
  membersCache,
  // 缓存键生成函数
  (email: string) => createCacheKey('members', 'email', email)
);

/**
 * 示例3: 使用缓存获取仪表盘数据
 * 适用于频繁访问但变动不频繁的数据
 */
export async function getDashboardStats() {
  // 缓存键
  const cacheKey = 'dashboard:stats';
  
  // 检查缓存
  const cachedStats = dashboardCache.get(cacheKey);
  if (cachedStats) {
    return cachedStats;
  }
  
  // 从数据库获取统计数据
  const [memberCount] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM members');
  const [articleCount] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM articles');
  const [bannerCount] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM banners');
  
  // 构建统计数据
  const stats = {
    members: memberCount[0]?.count || 0,
    articles: articleCount[0]?.count || 0,
    banners: bannerCount[0]?.count || 0,
    timestamp: new Date().toISOString()
  };
  
  // 存入缓存，设置10分钟过期
  dashboardCache.set(cacheKey, stats, 1000 * 60 * 10);
  
  return stats;
}

/**
 * 示例4: 无效化相关缓存
 * 在更新数据后调用，确保缓存与数据库同步
 */
export function invalidateMemberCache(memberId: number) {
  // 删除特定会员的缓存
  membersCache.delete(createCacheKey('members', 'member', memberId.toString()));
  
  // 删除可能包含此会员的列表缓存
  membersCache.delete('members:recent');
  membersCache.delete('members:active');
  
  // 可能需要更新的仪表盘缓存
  dashboardCache.delete('dashboard:stats');
}

/**
 * 示例5: 实现缓存预热
 * 在系统启动时或按计划执行，提前加载常用数据
 */
export async function preloadDashboardCache() {
  console.log('预热仪表盘缓存...');
  
  try {
    // 获取仪表盘统计数据并缓存
    await getDashboardStats();
    
    // 获取最近活跃会员并缓存
    const [recentMembers] = await pool.query<RowDataPacket[]>(
      'SELECT id, name, email, avatar_url FROM members ORDER BY updated_at DESC LIMIT 20'
    );
    
    dashboardCache.set('recent_members', recentMembers);
    
    console.log('仪表盘缓存预热完成');
    return true;
  } catch (error) {
    console.error('仪表盘缓存预热失败:', error);
    return false;
  }
} 