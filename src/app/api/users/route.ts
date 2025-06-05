import { NextResponse } from 'next/server';
import { executeQuery, testNetlifyConnection } from '@/lib/database-netlify';

// 获取所有用户
export async function GET(request: Request) {
  try {
    console.log('=== 开始获取用户列表 ===');
    
    // 首先测试数据库连接
    const dbConnected = await testNetlifyConnection();
    if (!dbConnected) {
      throw new Error('数据库连接失败');
    }
    
    // 从URL参数中获取分页信息
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '25');
    
    console.log('分页参数:', { page, pageSize });
    
    // 计算偏移量
    const offset = (page - 1) * pageSize;
    
    // 查询总记录数
    console.log('查询用户总数...');
    const [countResult] = await executeQuery('SELECT COUNT(*) as total FROM users');
    const total = (countResult as any[])[0].total;
    console.log('用户总数:', total);
    
    // 分页查询用户并关联会员信息
    console.log('查询用户列表...');
    const [users] = await executeQuery(
      `SELECT u.*, vm.member_id 
       FROM users u
       LEFT JOIN view_user_members vm ON u.id = vm.user_id
       ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );
    
    console.log('✓ 用户列表查询成功，返回', (users as any[]).length, '条记录');
    
    return NextResponse.json({ 
      success: true, 
      users,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error: any) {
    console.error('获取用户失败:', error);
    
    // 详细的错误日志
    if (error instanceof Error) {
      console.error('错误详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // 特殊处理数据库连接错误
      if (error.message.includes('connect') || error.message.includes('ECONNREFUSED')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Database connection failed. Please check server configuration.',
            details: '数据库连接失败，请检查服务器配置'
          },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: '获取用户列表失败',
        details: error instanceof Error ? error.message : '服务器内部错误'
      },
      { status: 500 }
    );
  }
}

// 创建新用户
export async function POST(request: Request) {
  try {
    console.log('=== 开始创建用户 ===');
    
    // 首先测试数据库连接
    const dbConnected = await testNetlifyConnection();
    if (!dbConnected) {
      throw new Error('数据库连接失败');
    }
    
    const data = await request.json();
    const { phone, username, nickname, password, member_type, status } = data as {
      phone: string;
      username?: string;
      nickname?: string;
      password?: string;
      member_type?: string;
      status?: string;
    };
    
    console.log('创建用户数据:', { phone, username, nickname, member_type, status });
    
    // 基本验证
    if (!phone) {
      return NextResponse.json(
        { success: false, error: '手机号不能为空' },
        { status: 400 }
      );
    }
    
    // 检查手机号是否已存在
    console.log('检查手机号是否已存在...');
    const [existingUsers] = await executeQuery('SELECT * FROM users WHERE phone = ?', [phone]);
    if ((existingUsers as any[]).length > 0) {
      console.log('手机号已存在:', phone);
      return NextResponse.json(
        { success: false, error: '该手机号已注册' },
        { status: 400 }
      );
    }
    
    // 插入新用户
    console.log('插入新用户...');
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
    
    const userId = (result as any).insertId;
    console.log('✓ 用户创建成功:', { userId });
    
    return NextResponse.json({ 
      success: true, 
      message: '用户创建成功',
      id: userId
    });
  } catch (error: any) {
    console.error('创建用户失败:', error);
    
    // 详细的错误日志
    if (error instanceof Error) {
      console.error('错误详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: '创建用户失败',
        details: error instanceof Error ? error.message : '服务器内部错误'
      },
      { status: 500 }
    );
  }
} 