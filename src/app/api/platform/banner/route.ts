import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse, handleApiError } from '@/lib/api-utils';
import { executeQuery } from '@/lib/database-netlify';

interface BannerCreateData {
  title: string;
  image_url: string;
  link_url?: string;
  sort_order?: number;
  status?: string;
}

interface BannerUpdateData extends BannerCreateData {
  id: number;
}

/**
 * 获取Banner列表
 */
export async function GET() {
  try {
    const [rows] = await executeQuery(`
      SELECT id, title, image_url, link_url, sort_order, status, created_at, updated_at
      FROM banners 
      ORDER BY sort_order ASC, created_at DESC
    `);
    
    const banners = Array.isArray(rows) ? rows : [];
    
    const response = createSuccessResponse(banners, '获取成功');
    
    // 设置防缓存头
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('获取Banner列表失败:', error);
    return handleApiError(error);
  }
}

/**
 * 创建Banner
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as BannerCreateData;
    const { title, image_url, link_url, sort_order = 0, status = 'active' } = body;

    // 验证必需字段
    if (!title || !image_url) {
      return createErrorResponse('标题和图片链接不能为空', 400);
    }

    // 处理状态值：转换为数据库格式(0/1)
    const dbStatus = status === 'active' ? 1 : 0;

    // 插入Banner数据（添加默认category_id）
    const [result] = await executeQuery(
      'INSERT INTO banners (title, image_url, link_url, category_id, sort_order, status) VALUES (?, ?, ?, ?, ?, ?)',
      [title, image_url, link_url, 1, sort_order, dbStatus]
    );

    const insertResult = result as any;
    const newId = insertResult.insertId;

    const response = createSuccessResponse({ id: newId }, '保存成功');
    
    // 设置防缓存头
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('创建Banner失败:', error);
    return handleApiError(error);
  }
}

/**
 * 更新Banner
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json() as BannerUpdateData;
    const { id, title, image_url, link_url, sort_order, status } = body;

    if (!id) {
      return createErrorResponse('Banner ID不能为空', 400);
    }

    // 处理状态值：转换为数据库格式(0/1)
    const dbStatus = status === 'active' ? 1 : 0;

    await executeQuery(
      'UPDATE banners SET title = ?, image_url = ?, link_url = ?, sort_order = ?, status = ?, updated_at = NOW() WHERE id = ?',
      [title, image_url, link_url, sort_order, dbStatus, id]
    );

    const response = createSuccessResponse(null, '更新成功');
    
    // 设置防缓存头
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('更新Banner失败:', error);
    return handleApiError(error);
  }
} 