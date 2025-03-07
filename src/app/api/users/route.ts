import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// 获取所有用户
export async function GET() {
  try {
    const [users] = await db.query('SELECT * FROM users ORDER BY created_at DESC');
    
    return NextResponse.json({ 
      success: true, 
      users 
    });
  } catch (error: any) {
    console.error('获取用户失败:', error);
    return NextResponse.json(
      { success: false, error: '获取用户列表失败' },
      { status: 500 }
    );
  }
}

// 创建新用户
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { phone, username, nickname, password, member_type, status } = data;
    
    // 基本验证
    if (!phone) {
      return NextResponse.json(
        { success: false, error: '手机号不能为空' },
        { status: 400 }
      );
    }
    
    // 检查手机号是否已存在
    const [existingUsers] = await db.query('SELECT * FROM users WHERE phone = ?', [phone]);
    if ((existingUsers as any[]).length > 0) {
      return NextResponse.json(
        { success: false, error: '该手机号已注册' },
        { status: 400 }
      );
    }
    
    // 插入新用户
    const result = await db.query(
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
    
    return NextResponse.json({ 
      success: true, 
      message: '用户创建成功',
      id: (result as any)[0].insertId
    });
  } catch (error: any) {
    console.error('创建用户失败:', error);
    return NextResponse.json(
      { success: false, error: '创建用户失败' },
      { status: 500 }
    );
  }
} 