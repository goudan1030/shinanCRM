import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const memberId = await params.id;

    // 从MySQL数据库获取会员操作日志
    const [logs] = await pool.execute(
      'SELECT * FROM member_operation_logs WHERE member_id = ? ORDER BY created_at DESC',
      [memberId]
    );

    return NextResponse.json(logs);
  } catch (error) {
    console.error('获取会员操作日志失败:', error);
    return NextResponse.json(
      { error: '获取会员操作日志失败' },
      { status: 500 }
    );
  }
}