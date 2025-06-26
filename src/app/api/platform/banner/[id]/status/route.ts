import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse, handleApiError } from '@/lib/api-utils';
import { executeQuery } from '@/lib/database-netlify';

/**
 * 更新Banner状态
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = await request.json() as { status: number | string };
    
    if (isNaN(id)) {
      return createErrorResponse('无效的Banner ID', 400);
    }

    const { status: rawStatus } = body;
    
    // 处理状态值：数据库存储0/1，前端可能传0/1或'active'/'inactive'
    let dbStatus: number;
    if (typeof rawStatus === 'number') {
      dbStatus = rawStatus;
    } else if (typeof rawStatus === 'string') {
      dbStatus = rawStatus === 'active' ? 1 : 0;
    } else {
      return createErrorResponse('状态值无效', 400);
    }
    
    // 验证状态值
    if (![0, 1].includes(dbStatus)) {
      return createErrorResponse('状态值必须是0或1', 400);
    }

    await executeQuery(
      'UPDATE banners SET status = ?, updated_at = NOW() WHERE id = ?',
      [dbStatus, id]
    );

    const response = createSuccessResponse(null, '状态更新成功');
    
    // 设置防缓存头
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('更新Banner状态失败:', error);
    return handleApiError(error);
  }
} 