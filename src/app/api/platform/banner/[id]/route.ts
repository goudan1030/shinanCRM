import { createSuccessResponse, createErrorResponse, handleApiError } from '@/lib/api-utils';
import { executeQuery } from '@/lib/database-netlify';
import { NextRequest } from 'next/server';

/**
 * 获取单个Banner
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return createErrorResponse('无效的Banner ID', 400);
    }

    const [rows] = await executeQuery(
      'SELECT * FROM banners WHERE id = ?',
      [id]
    );

    const banners = Array.isArray(rows) ? rows : [];
    const banner = banners[0];

    if (!banner) {
      return createErrorResponse('Banner不存在', 404);
    }

    const response = createSuccessResponse(banner, '获取成功');
    
    // 设置防缓存头
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('获取Banner失败:', error);
    return handleApiError(error);
  }
}

/**
 * 删除Banner
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return createErrorResponse('无效的Banner ID', 400);
    }

    await executeQuery('DELETE FROM banners WHERE id = ?', [id]);

    const response = createSuccessResponse(null, '删除成功');
    
    // 设置防缓存头
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('删除Banner失败:', error);
    return handleApiError(error);
  }
} 