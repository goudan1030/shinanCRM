import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/users');

// 获取所有用户
export async function GET(request: Request) {
  try {
    // 从URL参数中获取分页信息
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '25');
    
    // 计算偏移量
    const offset = (page - 1) * pageSize;
    
    // 查询总记录数
    const [countResult] = await executeQuery('SELECT COUNT(*) as total FROM users');
    interface CountResult {
      total: number;
    }
    const total = Array.isArray(countResult) && countResult[0] && typeof countResult[0] === 'object' && 'total' in countResult[0]
      ? Number((countResult[0] as CountResult).total) || 0
      : 0;
    
    // 分页查询用户并关联会员信息，包含view_count字段
    const [users] = await executeQuery(
      `SELECT u.*, vm.member_id 
       FROM users u
       LEFT JOIN view_user_members vm ON u.id = vm.user_id
       ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );
    
    return createSuccessResponse({
      users,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }, '获取用户列表成功');
  } catch (error) {
    logger.error('获取用户失败', error instanceof Error ? error : new Error(String(error)));
    
    // 特殊处理数据库连接错误
    if (error instanceof Error && (error.message.includes('connect') || error.message.includes('ECONNREFUSED'))) {
      return createErrorResponse('数据库连接失败，请检查服务器配置', 503);
    }
    
    return createErrorResponse('获取用户列表失败', 500);
  }
}

// 创建新用户
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { phone, username, nickname, password, member_type, status } = data as {
      phone: string;
      username?: string;
      nickname?: string;
      password?: string;
      member_type?: string;
      status?: string;
    };
    
    // 基本验证
    if (!phone) {
      return createErrorResponse('手机号不能为空', 400);
    }
    
    // 检查手机号是否已存在
    const [existingUsers] = await executeQuery('SELECT * FROM users WHERE phone = ?', [phone]);
    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      return createErrorResponse('该手机号已注册', 400);
    }
    
    // 插入新用户
    const [result] = await executeQuery(
      'INSERT INTO users (phone, username, nickname, password, member_type, status) VALUES (?, ?, ?, ?, ?, ?)',
      [
        phone, 
        username || null, 
        nickname || null, 
        password || null, 
        member_type || '普通会员',
        status || 'not-logged-in'
      ]
    );
    
    interface InsertResult {
      insertId: number;
      affectedRows: number;
    }
    const userId = result && typeof result === 'object' && 'insertId' in result
      ? (result as InsertResult).insertId
      : null;
    
    return createSuccessResponse({ 
      id: userId
    }, '用户创建成功');
  } catch (error) {
    logger.error('创建用户失败', error instanceof Error ? error : new Error(String(error)));
    return createErrorResponse('创建用户失败', 500);
  }
} 