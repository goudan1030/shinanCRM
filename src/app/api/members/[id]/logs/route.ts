import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const memberId = await params.id;

    // 从MySQL数据库获取会员操作日志，关联查询操作人邮箱
    const [logs] = await pool.execute(
      `SELECT l.*, u.email as operator_email 
      FROM member_operation_logs l
      LEFT JOIN admin_users u ON l.operator_id = u.id
      WHERE l.member_id = ? 
      ORDER BY l.created_at DESC`,
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