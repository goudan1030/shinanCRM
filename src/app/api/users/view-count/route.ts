import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';

// 增加用户查看次数
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { userId, addCount } = data as {
      userId: number;
      addCount: number;
    };
    
    // 基本验证
    if (!userId || !addCount || addCount <= 0) {
      return NextResponse.json(
        { success: false, error: '参数无效' },
        { status: 400 }
      );
    }
    
    // 获取当前用户信息
    const [userResult] = await executeQuery(
      'SELECT id, view_count FROM users WHERE id = ?',
      [userId]
    );
    
    const users = userResult as any[];
    if (users.length === 0) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }
    
    const currentUser = users[0];
    const currentViewCount = currentUser.view_count || 0;
    const newViewCount = currentViewCount + addCount;
    
    // 更新用户查看次数
    await executeQuery(
      'UPDATE users SET view_count = ? WHERE id = ?',
      [newViewCount, userId]
    );
    
    return NextResponse.json({ 
      success: true, 
      message: '查看次数更新成功',
      oldCount: currentViewCount,
      addCount: addCount,
      newCount: newViewCount
    });
  } catch (error: any) {
    console.error('增加查看次数失败:', error);
    
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
        error: '增加查看次数失败',
        details: error instanceof Error ? error.message : '服务器内部错误'
      },
      { status: 500 }
    );
  }
} 