import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const data = await request.json();
    const { reason } = data;
    
    // 获取会员UUID
    const memberUuid = params.id;
    console.log('会员UUID:', memberUuid);

    // 首先使用UUID查找会员的数字ID
    const [idRows] = await pool.execute(
      'SELECT id, status FROM members WHERE uuid = ? OR old_id = ?',
      [memberUuid, memberUuid]
    );

    if (!idRows[0]) {
      return NextResponse.json(
        { error: '会员不存在' },
        { status: 404 }
      );
    }

    const member = idRows[0];
    const memberId = member.id; // 获取数字类型的ID
    
    console.log('找到会员ID:', memberId, '类型:', typeof memberId);

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
        [memberId]
      );

      // 添加调试日志
      console.log('执行撤销操作插入日志，member_id:', memberId, '类型:', typeof memberId);
      
      // 记录撤销操作
      await connection.execute(
        `INSERT INTO member_operation_logs (
          member_id, operation_type, notes, created_at
        ) VALUES (?, 'REVOKE', ?, NOW())`,
        [memberId, reason]
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