import { executeQuery, testNetlifyConnection } from '@/lib/database-netlify';
import { queryCache } from '@/lib/cache';
import { Banner, BannerCreateData, BannerUpdateData } from '@/types/banner';

// 缓存键前缀
const CACHE_KEY_PREFIX = 'banner:';
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

// 获取Banner列表
export async function getBannerList(options: { 
  category?: string | null; 
  status?: string | null;
}): Promise<Banner[]> {
  console.log('=== 开始获取Banner列表 ===');
  
  // 首先测试数据库连接
  const dbConnected = await testNetlifyConnection();
  if (!dbConnected) {
    throw new Error('数据库连接失败');
  }
  
  const { category, status } = options;
  
  // 构建缓存键
  const cacheKey = `${CACHE_KEY_PREFIX}list:${category || 'all'}:${status || 'all'}`;
  
  // 检查缓存
  const cachedData = queryCache.get(cacheKey);
  if (cachedData) {
    console.log('使用缓存的Banner列表数据');
    return cachedData;
  }
  
  let sql = 'SELECT * FROM banners WHERE 1=1';
  const params: any[] = [];

  if (category && category !== 'all') {
    sql += ' AND category_id = ?';
    params.push(category);
  }

  if (status && status !== 'all') {
    sql += ' AND status = ?';
    params.push(status);
  }

  sql += ' ORDER BY sort_order DESC, created_at DESC';

  console.log('执行Banner查询...');
  const [rows] = await executeQuery(sql, params);
  console.log('✓ Banner列表查询成功，返回', (rows as any[]).length, '条记录');
  
  // 存入缓存
  queryCache.set(cacheKey, rows, CACHE_TTL);
  
  return rows as Banner[];
}

// 获取单个Banner
export async function getBannerById(id: number): Promise<Banner | null> {
  console.log('获取Banner详情:', id);
  
  // 首先测试数据库连接
  const dbConnected = await testNetlifyConnection();
  if (!dbConnected) {
    throw new Error('数据库连接失败');
  }
  
  const cacheKey = `${CACHE_KEY_PREFIX}id:${id}`;
  
  // 检查缓存
  const cachedData = queryCache.get(cacheKey);
  if (cachedData) {
    console.log(`使用缓存的Banner数据 ID:${id}`);
    return cachedData;
  }
  
  const [rows] = await executeQuery(
    'SELECT * FROM banners WHERE id = ?',
    [id]
  );
  
  const banner = (rows as Banner[])[0] || null;
  
  if (banner) {
    queryCache.set(cacheKey, banner, CACHE_TTL);
    console.log('✓ Banner详情查询成功');
  } else {
    console.log('Banner不存在:', id);
  }
  
  return banner;
}

// 创建新Banner
export async function createBanner(data: BannerCreateData): Promise<number> {
  console.log('创建新Banner:', data.title);
  
  // 首先测试数据库连接
  const dbConnected = await testNetlifyConnection();
  if (!dbConnected) {
    throw new Error('数据库连接失败');
  }
  
  const [result] = await executeQuery(
    `INSERT INTO banners (
      category_id, 
      title, 
      image_url,
      link_url,
      sort_order,
      status,
      start_time,
      end_time,
      remark
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.category_id,
      data.title,
      data.image_url,
      data.link_url || null,
      data.sort_order,
      data.status,
      data.start_time || null,
      data.end_time || null,
      data.remark || null
    ]
  );
  
  const insertId = (result as any).insertId;
  console.log('✓ Banner创建成功:', { insertId });
  
  // 清除列表缓存
  clearBannerListCache();
  
  return insertId;
}

// 更新Banner
export async function updateBanner(id: number, data: BannerUpdateData): Promise<void> {
  console.log('更新Banner:', id, data.title);
  
  // 首先测试数据库连接
  const dbConnected = await testNetlifyConnection();
  if (!dbConnected) {
    throw new Error('数据库连接失败');
  }
  
  await executeQuery(
    `UPDATE banners SET 
      category_id = ?, 
      title = ?, 
      image_url = ?,
      link_url = ?,
      sort_order = ?,
      status = ?,
      start_time = ?,
      end_time = ?,
      remark = ?
    WHERE id = ?`,
    [
      data.category_id,
      data.title,
      data.image_url,
      data.link_url || null,
      data.sort_order,
      data.status,
      data.start_time || null,
      data.end_time || null,
      data.remark || null,
      id
    ]
  );
  
  console.log('✓ Banner更新成功');
  
  // 清除相关缓存
  clearBannerCache(id);
}

// 更新Banner状态
export async function updateBannerStatus(id: number, status: 0 | 1): Promise<void> {
  console.log('更新Banner状态:', id, status);
  
  // 首先测试数据库连接
  const dbConnected = await testNetlifyConnection();
  if (!dbConnected) {
    throw new Error('数据库连接失败');
  }
  
  await executeQuery(
    'UPDATE banners SET status = ? WHERE id = ?',
    [status, id]
  );
  
  console.log('✓ Banner状态更新成功');
  
  // 清除相关缓存
  clearBannerCache(id);
}

// 删除Banner
export async function deleteBanner(id: number): Promise<void> {
  console.log('删除Banner:', id);
  
  // 首先测试数据库连接
  const dbConnected = await testNetlifyConnection();
  if (!dbConnected) {
    throw new Error('数据库连接失败');
  }
  
  await executeQuery(
    'DELETE FROM banners WHERE id = ?',
    [id]
  );
  
  console.log('✓ Banner删除成功');
  
  // 清除相关缓存
  clearBannerCache(id);
}

// 清除单个Banner缓存
function clearBannerCache(id: number): void {
  queryCache.delete(`${CACHE_KEY_PREFIX}id:${id}`);
  clearBannerListCache();
}

// 清除所有Banner列表缓存
function clearBannerListCache(): void {
  const cacheKeys = queryCache.keys();
  const listCachePattern = `${CACHE_KEY_PREFIX}list:`;
  
  cacheKeys.forEach(key => {
    if (key.startsWith(listCachePattern)) {
      queryCache.delete(key);
    }
  });
} 