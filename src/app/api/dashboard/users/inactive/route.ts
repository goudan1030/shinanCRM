import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';

export async function GET() {
  try {
    // 查询未激活用户数（status = 'temporary'）
    const [result] = await executeQuery("SELECT COUNT(*) as total FROM users WHERE status = 'temporary'");
    const total = result[0].total;

    return NextResponse.json({ count: total });
  } catch (error) {
    console.error('获取未激活用户数失败:', error);
    return NextResponse.json(
      { error: '获取未激活用户数失败' },
      { status: 500 }
    );
  }
}
