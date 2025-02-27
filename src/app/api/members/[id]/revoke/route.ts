import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const data = await request.json();
    const { reason } = data;

    // 获取当前会员信息
    const [memberRows] = await pool.execute(
      'SELECT status FROM members WHERE id = ?',
      [params.id]
    );

    if (!memberRows[0]) {
      return NextResponse.json(
        { error: '会员不存在' },
        { status: 404 }
      );
    }

    const member = memberRows[0];

    // 验证会员状态
    if (member.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: '只能撤销激活状态的会员' },
        { status: 400 }
      );
    }

    // 开始事务
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 更新会员状态
      await connection.execute(
        'UPDATE members SET status = "REVOKED", updated_at = NOW() WHERE id = ?',
        [params.id]
      );

      // 记录撤销操作
      await connection.execute(
        `INSERT INTO member_operation_logs (
          member_id, operation_type, notes, created_at
        ) VALUES (?, 'REVOKE', ?, NOW())`,
        [params.id, reason]
      );

      await connection.commit();

      return NextResponse.json({ message: '会员撤销成功' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('会员撤销失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '会员撤销失败' },
      { status: 500 }
    );
  }
}