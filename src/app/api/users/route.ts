import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const memberType = searchParams.get('memberType') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    
    // 创建数据库连接
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    
    const connection = await pool.getConnection();
    
    // 构建查询条件
    let conditions = [];
    let params = [];
    
    if (search) {
      conditions.push('(phone LIKE ? OR username LIKE ? OR nickname LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    
    if (memberType) {
      conditions.push('member_type = ?');
      params.push(memberType);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // 查询总数
    const [countResult] = await connection.query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    );
    const total = (countResult as any[])[0].total;
    
    // 计算分页
    const offset = (page - 1) * pageSize;
    
    // 查询数据
    const [users] = await connection.query(
      `SELECT 
        id, phone, status, username, nickname, avatar, 
        notification_enabled, created_at, updated_at, last_login_at, 
        registered, refresh_count, member_type 
      FROM users 
      ${whereClause} 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    
    // 查询各种状态的用户数量
    const [statusCounts] = await connection.query(`
      SELECT 
        status, 
        COUNT(*) as count 
      FROM users 
      GROUP BY status
    `);
    
    // 查询各种会员类型的用户数量
    const [memberTypeCounts] = await connection.query(`
      SELECT 
        member_type as memberType, 
        COUNT(*) as count 
      FROM users 
      GROUP BY member_type
    `);
    
    // 处理状态统计
    const statusCountsMap: Record<string, number> = {};
    (statusCounts as any[]).forEach((item: any) => {
      statusCountsMap[item.status] = item.count;
    });
    
    // 处理会员类型统计
    const memberTypeCountsMap: Record<string, number> = {};
    (memberTypeCounts as any[]).forEach((item: any) => {
      memberTypeCountsMap[item.memberType] = item.count;
    });
    
    connection.release();
    
    return NextResponse.json({
      success: true,
      data: users,
      total,
      page,
      pageSize,
      statusCounts: statusCountsMap,
      memberTypeCounts: memberTypeCountsMap
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取用户列表失败' },
      { status: 500 }
    );
  }
} 