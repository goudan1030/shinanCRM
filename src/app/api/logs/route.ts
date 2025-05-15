import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// 创建操作日志
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }
    
    const data = await request.json();
    
    // 验证必填字段
    if (!data.operation_type || !data.target_type) {
      return NextResponse.json(
        { error: '操作类型和目标类型不能为空' },
        { status: 400 }
      );
    }
    
    // 获取当前用户ID
    const userId = (session.user as any).id;
    
    // 插入操作日志
    const [result] = await pool.execute(
      `INSERT INTO operation_logs (
        user_id, operation_type, target_type, target_id, detail, created_at
      ) VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        userId,
        data.operation_type,
        data.target_type,
        data.target_id || null,
        data.detail || null
      ]
    );
    
    return NextResponse.json({
      success: true,
      message: '操作日志已记录',
      id: (result as any).insertId
    });
    
  } catch (error) {
    console.error('记录操作日志失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '记录失败' },
      { status: 500 }
    );
  }
}

// 查询操作日志
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }
    
    // 解析查询参数
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
    const targetType = url.searchParams.get('targetType');
    const targetId = url.searchParams.get('targetId');
    const operationType = url.searchParams.get('operationType');
    const userId = url.searchParams.get('userId');
    
    // 构建查询条件
    let conditions = [];
    let params = [];
    
    if (targetType) {
      conditions.push('target_type = ?');
      params.push(targetType);
    }
    
    if (targetId) {
      conditions.push('target_id = ?');
      params.push(targetId);
    }
    
    if (operationType) {
      conditions.push('operation_type = ?');
      params.push(operationType);
    }
    
    if (userId) {
      conditions.push('user_id = ?');
      params.push(userId);
    }
    
    // 构建查询语句
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // 计算总记录数
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM operation_logs ${whereClause}`,
      params
    );
    const total = (countResult as any)[0].total;
    
    // 分页查询数据
    const offset = (page - 1) * pageSize;
    const queryParams = [...params, offset, pageSize];
    
    const [logs] = await pool.execute(
      `SELECT ol.*, u.username as operator_name, u.email as operator_email
       FROM operation_logs ol
       LEFT JOIN admin_users u ON ol.user_id = u.id
       ${whereClause}
       ORDER BY ol.created_at DESC
       LIMIT ?, ?`,
      queryParams
    );
    
    return NextResponse.json({
      data: logs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
    
  } catch (error) {
    console.error('查询操作日志失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '查询失败' },
      { status: 500 }
    );
  }
} 