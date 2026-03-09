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

/** 遇到 image_url 过长时尝试自动执行 ALTER TABLE（MEDIUMTEXT 最大约 16MB，可存大图 base64） */
async function ensureBannerColumnsText(): Promise<boolean> {
  try {
    await executeQuery(
      `ALTER TABLE banners
       MODIFY COLUMN image_url MEDIUMTEXT NOT NULL COMMENT '图片URL',
       MODIFY COLUMN link_url MEDIUMTEXT COMMENT '跳转链接'`
    );
    return true;
  } catch {
    return false;
  }
}

function isDataTooLongError(err: unknown): boolean {
  const e = err as { code?: string; errno?: number };
  return e.code === 'ER_DATA_TOO_LONG' || e.errno === 1406;
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
 * 若因 image_url 过长报错，会尝试自动执行 ALTER TABLE 后重试一次（需 DB 用户有 ALTER 权限）
 */
export async function POST(request: NextRequest) {
  const body = await request.json() as BannerCreateData;
  const { title, image_url, link_url, sort_order = 0, status = 'active' } = body;

  if (!title || !image_url) {
    return createErrorResponse('标题和图片链接不能为空', 400);
  }

  const dbStatus = status === 'active' ? 1 : 0;
  const insertParams = [title, image_url, link_url, 1, sort_order, dbStatus] as const;

  try {
    const [result] = await executeQuery(
      'INSERT INTO banners (title, image_url, link_url, category_id, sort_order, status) VALUES (?, ?, ?, ?, ?, ?)',
      insertParams
    );
    const insertResult = result as { insertId?: number };
    const newId = insertResult.insertId;
    const response = createSuccessResponse({ id: newId }, '保存成功');
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  } catch (error: unknown) {
    if (!isDataTooLongError(error)) {
      console.error('创建Banner失败:', error);
      return handleApiError(error);
    }
    // 尝试自动修改表结构后重试一次
    const altered = await ensureBannerColumnsText();
    if (!altered) {
      return createErrorResponse(
        '图片链接过长，且当前数据库用户无权限自动修改表结构。请让管理员在应用所连的数据库（与 .env 中 DB_HOST 一致）上执行：ALTER TABLE banners MODIFY COLUMN image_url TEXT NOT NULL, MODIFY COLUMN link_url TEXT;',
        400
      );
    }
    try {
      const [result] = await executeQuery(
        'INSERT INTO banners (title, image_url, link_url, category_id, sort_order, status) VALUES (?, ?, ?, ?, ?, ?)',
        insertParams
      );
      const insertResult = result as { insertId?: number };
      const newId = insertResult.insertId;
      const response = createSuccessResponse({ id: newId }, '保存成功');
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      return response;
    } catch (retryError: unknown) {
      console.error('创建Banner重试仍失败:', retryError);
      return createErrorResponse(
        '图片链接过长，表结构已尝试自动修改但仍保存失败，请稍后重试或联系管理员检查数据库。',
        400
      );
    }
  }
}

/**
 * 更新Banner
 * 若因 image_url 过长报错，会尝试自动执行 ALTER TABLE 后重试一次
 */
export async function PUT(request: NextRequest) {
  const body = await request.json() as BannerUpdateData & { category_id?: number };
  const { id, title, image_url, link_url, sort_order, status, category_id } = body;

  if (!id) {
    return createErrorResponse('Banner ID不能为空', 400);
  }

  const dbStatus = status === 'active' ? 1 : 0;
  const categoryId = category_id ?? 1;
  const updateParams = [title, image_url, link_url, categoryId, sort_order, dbStatus, id] as const;

  try {
    await executeQuery(
      'UPDATE banners SET title = ?, image_url = ?, link_url = ?, category_id = ?, sort_order = ?, status = ?, updated_at = NOW() WHERE id = ?',
      updateParams
    );
    const response = createSuccessResponse(null, '更新成功');
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  } catch (error: unknown) {
    if (!isDataTooLongError(error)) {
      console.error('更新Banner失败:', error);
      return handleApiError(error);
    }
    const altered = await ensureBannerColumnsText();
    if (!altered) {
      return createErrorResponse(
        '图片链接过长，且当前数据库用户无权限自动修改表结构。请让管理员在应用所连的数据库上执行 ALTER TABLE banners MODIFY COLUMN image_url TEXT NOT NULL, MODIFY COLUMN link_url TEXT;',
        400
      );
    }
    try {
      await executeQuery(
        'UPDATE banners SET title = ?, image_url = ?, link_url = ?, category_id = ?, sort_order = ?, status = ?, updated_at = NOW() WHERE id = ?',
        updateParams
      );
      const response = createSuccessResponse(null, '更新成功');
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      return response;
    } catch (retryError: unknown) {
      console.error('更新Banner重试仍失败:', retryError);
      return handleApiError(retryError);
    }
  }
} 