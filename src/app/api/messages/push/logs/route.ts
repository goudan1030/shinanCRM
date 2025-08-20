import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromRequest } from '@/lib/token';
import { executeQuery } from '@/lib/database-netlify';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // 获取Token
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { success: false, message: '未授权访问' },
        { status: 401 }
      );
    }

    // 验证Token
    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Token无效' },
        { status: 401 }
      );
    }

    // 降低权限要求：从管理员权限改为普通用户权限
    if (user.role < 1) { // 只需要登录用户权限
      return NextResponse.json(
        { success: false, message: '权限不足，需要登录权限' },
        { status: 403 }
      );
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type') || '';
    const startDate = searchParams.get('start_date') || '';
    const endDate = searchParams.get('end_date') || '';

    const offset = (page - 1) * limit;

    // 构建查询条件
    let whereConditions = [];
    let queryParams = [];

    if (type && type !== 'all') {
      whereConditions.push('pl.type = ?');
      queryParams.push(type);
    }

    if (startDate) {
      whereConditions.push('pl.created_at >= ?');
      queryParams.push(startDate + ' 00:00:00');
    }

    if (endDate) {
      whereConditions.push('pl.created_at <= ?');
      queryParams.push(endDate + ' 23:59:59');
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM push_logs pl
      ${whereClause}
    `;
    
    const [countResult] = await executeQuery(countQuery, queryParams);
    const total = (countResult as any[])[0]?.total || 0;

    // 查询日志列表
    const logsQuery = `
      SELECT 
        pl.id,
        pl.type,
        pl.title,
        pl.content,
        pl.target_users,
        pl.created_by,
        pl.created_at,
        u.username as created_by_name
      FROM push_logs pl
      LEFT JOIN users u ON pl.created_by = u.id
      ${whereClause}
      ORDER BY pl.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const [logsResult] = await executeQuery(logsQuery, [...queryParams, limit, offset]);
    const logs = logsResult as any[];

    // 格式化数据
    const formattedLogs = logs.map((log: any) => ({
      id: log.id || 0,
      type: log.type || 'system_notice',
      type_text: log.type === 'announcement' ? '公告推送' : '系统通知',
      title: log.title || '无标题',
      content: log.content || '无内容',
      target_users: log.target_users && log.target_users !== 'null' && log.target_users !== '' 
        ? (() => {
            try {
              return JSON.parse(log.target_users);
            } catch (e) {
              return null;
            }
          })()
        : null,
      created_by: log.created_by || 0,
      created_by_name: log.created_by_name || '系统',
      created_at: log.created_at || new Date().toISOString()
    }));

    const result = {
      success: true,
      data: {
        logs: formattedLogs,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit)
        }
      }
    };

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    logger.error('获取推送日志失败', { error: error instanceof Error ? error.message : String(error) });
    
    // 如果表不存在或其他错误，返回空数据
    return NextResponse.json({
      success: true,
      data: {
        logs: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          total_pages: 0
        }
      }
    });
  }
}
