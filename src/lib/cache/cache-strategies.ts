/**
 * 缓存策略配置
 * 定义不同类型的缓存配置和预热函数
 */
import { CacheOptions } from './cache-manager';
import pool from '../database';
import { RowDataPacket } from 'mysql2';

/**
 * 会员缓存策略
 */
export const membersCacheStrategy: CacheOptions = {
  namespace: 'members',
  max: 2000, // 最多缓存2000个会员
  ttl: 1000 * 60 * 30, // 30分钟过期
  monitoring: true,
  // 预热函数 - 加载热门会员数据
  preloadFunction: async () => {
    try {
      // 获取最近活跃的前100名会员，只查询确定存在的字段
      const [members] = await pool.query<RowDataPacket[]>(`
        SELECT id, updated_at 
        FROM members 
        ORDER BY updated_at DESC 
        LIMIT 100
      `);

      // 构建缓存键值对
      const cacheData: Record<string, any> = {};
      for (const member of members) {
        cacheData[`member:${member.id}`] = member;
      }

      console.log(`会员缓存预热完成: 加载了 ${members.length} 条记录`);
      return cacheData;
    } catch (error) {
      console.error('会员缓存预热失败:', error);
      return {};
    }
  }
};

/**
 * 仪表盘缓存策略
 */
export const dashboardCacheStrategy: CacheOptions = {
  namespace: 'dashboard',
  max: 100, // 仪表盘数据较少
  ttl: 1000 * 60 * 5, // 5分钟过期
  monitoring: true,
  // 预热函数 - 加载常用的仪表盘数据
  preloadFunction: async () => {
    try {
      const [memberCountResult] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM members');
      
      // 获取收入和支出数据
      const [incomeTotal] = await pool.query<RowDataPacket[]>(`
        SELECT SUM(amount) as total 
        FROM income_records 
        WHERE MONTH(created_at) = MONTH(CURRENT_DATE())
        AND YEAR(created_at) = YEAR(CURRENT_DATE())
      `);
      
      const [expenseTotal] = await pool.query<RowDataPacket[]>(`
        SELECT SUM(amount) as total 
        FROM expense_records 
        WHERE MONTH(created_at) = MONTH(CURRENT_DATE())
        AND YEAR(created_at) = YEAR(CURRENT_DATE())
      `);

      return {
        'stats:member_count': memberCountResult[0]?.count || 0,
        'finance_summary': {
          total_income: incomeTotal[0]?.total || 0,
          total_expense: expenseTotal[0]?.total || 0
        }
      };
    } catch (error) {
      console.error('仪表盘缓存预热失败:', error);
      return {};
    }
  }
};

/**
 * 配置数据缓存策略
 */
export const configCacheStrategy: CacheOptions = {
  namespace: 'config',
  max: 200,
  ttl: 1000 * 60 * 60, // 1小时过期
  monitoring: true,
  // 预热函数 - 系统默认配置
  preloadFunction: async () => {
    try {
      // 由于system_configs表不存在，使用默认配置
      const defaultConfigs = {
        'site_name': 'SNCRM系统',
        'site_description': '客户关系管理系统',
        'member_types': JSON.stringify(['普通会员', '年费会员', '一次性会员']),
        'allow_registration': 'true',
        'default_member_type': '普通会员',
        'enable_notification': 'true',
        'cache_ttl': '300'
      };
      
      const cacheData: Record<string, any> = {};
      for (const [key, value] of Object.entries(defaultConfigs)) {
        cacheData[`config:${key}`] = value;
      }
      
      return cacheData;
    } catch (error) {
      console.error('配置缓存预热失败:', error);
      return {};
    }
  }
};

/**
 * 文章缓存策略
 */
export const articlesCacheStrategy: CacheOptions = {
  namespace: 'articles',
  max: 500,
  ttl: 1000 * 60 * 15, // 15分钟过期
  monitoring: true,
  // 预热函数 - 加载热门文章
  preloadFunction: async () => {
    try {
      // 检查articles表结构
      const [columns] = await pool.query<RowDataPacket[]>(`
        SHOW COLUMNS FROM articles
      `);
      
      // 获取所有列名
      const columnNames = columns.map(col => col.Field);
      
      // 构建查询SQL，只选择存在的列
      const selectColumns = ['id'];
      if (columnNames.includes('title')) selectColumns.push('title');
      if (columnNames.includes('summary')) selectColumns.push('summary');
      if (columnNames.includes('is_top')) selectColumns.push('is_top');
      if (columnNames.includes('views')) selectColumns.push('views');
      
      // 构建查询条件，只使用存在的列
      let whereClause = '';
      if (columnNames.includes('is_hidden')) {
        whereClause = 'WHERE is_hidden = 0';
      }
      
      // 构建排序，只使用存在的列
      let orderClause = 'ORDER BY id DESC';
      if (columnNames.includes('is_top') && columnNames.includes('views')) {
        orderClause = 'ORDER BY is_top DESC, views DESC';
      } else if (columnNames.includes('is_top')) {
        orderClause = 'ORDER BY is_top DESC, id DESC';
      } else if (columnNames.includes('views')) {
        orderClause = 'ORDER BY views DESC';
      }
      
      const sql = `
        SELECT ${selectColumns.join(', ')} 
        FROM articles 
        ${whereClause}
        ${orderClause}
        LIMIT 20
      `;
      
      const [articles] = await pool.query<RowDataPacket[]>(sql);
      
      const cacheData: Record<string, any> = {};
      for (const article of articles) {
        cacheData[`article:${article.id}`] = article;
      }
      
      // 只有在is_top存在的情况下才筛选置顶文章
      if (columnNames.includes('is_top')) {
        const topArticles = articles.filter((article: RowDataPacket) => article.is_top === 1);
        cacheData['top_articles'] = topArticles;
      }
      
      cacheData['popular_articles'] = articles;
      
      return cacheData;
    } catch (error) {
      console.error('文章缓存预热失败:', error);
      return {};
    }
  }
};

/**
 * Banner缓存策略
 */
export const bannersCacheStrategy: CacheOptions = {
  namespace: 'banners',
  max: 100,
  ttl: 1000 * 60 * 10, // 10分钟过期
  monitoring: true,
  // 预热函数 - 加载所有活跃Banner
  preloadFunction: async () => {
    try {
      // 检查banners表结构
      const [columns] = await pool.query<RowDataPacket[]>(`
        SHOW COLUMNS FROM banners
      `);
      
      // 获取所有列名
      const columnNames = columns.map(col => col.Field);
      
      // 构建查询条件，只使用存在的列
      let whereClause = '';
      let params: any[] = [];
      
      if (columnNames.includes('status')) {
        whereClause = 'WHERE status = 1';
        
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        
        if (columnNames.includes('start_time') && columnNames.includes('end_time')) {
          whereClause += ' AND (start_time IS NULL OR start_time <= ?) AND (end_time IS NULL OR end_time >= ?)';
          params = [now, now];
        }
      }
      
      // 构建排序，只使用存在的列
      let orderClause = 'ORDER BY id ASC';
      if (columnNames.includes('sort_order')) {
        orderClause = 'ORDER BY sort_order ASC';
      }
      
      const sql = `
        SELECT * FROM banners 
        ${whereClause}
        ${orderClause}
      `;
      
      const [banners] = await pool.query<RowDataPacket[]>(sql, params);
      
      const cacheData: Record<string, any> = {};
      
      // 只在category_id存在的情况下按分类分组
      if (columnNames.includes('category_id')) {
        // 按分类分组
        const categorizedBanners: Record<number, RowDataPacket[]> = {};
        for (const banner of banners) {
          const categoryId = banner.category_id;
          if (!categorizedBanners[categoryId]) {
            categorizedBanners[categoryId] = [];
          }
          categorizedBanners[categoryId].push(banner);
        }
        
        // 缓存每个分类的Banner
        for (const [categoryId, categoryBanners] of Object.entries(categorizedBanners)) {
          cacheData[`category:${categoryId}`] = categoryBanners;
        }
      }
      
      // 缓存所有活跃Banner
      cacheData['active_banners'] = banners;
      
      return cacheData;
    } catch (error) {
      console.error('Banner缓存预热失败:', error);
      return {};
    }
  }
};

// 所有缓存策略的集合
export const allCacheStrategies = [
  membersCacheStrategy,
  dashboardCacheStrategy,
  configCacheStrategy,
  articlesCacheStrategy,
  bannersCacheStrategy
]; 