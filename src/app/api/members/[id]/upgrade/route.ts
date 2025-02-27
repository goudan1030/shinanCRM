import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const data = await request.json();
    const { type, payment_time, expiry_time, notes } = data;

    // 获取当前会员信息
    const [memberRows] = await pool.execute(
      'SELECT type, status FROM members WHERE id = ?',
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
        { error: '只能升级激活状态的会员' },
        { status: 400 }
      );
    }

    // 验证会员类型变更
    if (member.type === type || (member.type === 'ANNUAL' && type === 'ONE_TIME')) {
      return NextResponse.json(
        { error: '不允许的会员类型变更' },
        { status: 400 }
      );
    }

    // 获取当前用户ID
    const currentUserId = request.headers.get('x-user-id');
    if (!currentUserId) {
      return NextResponse.json(
        { error: '未获取到操作人信息' },
        { status: 401 }
      );
    }

    // 开始事务
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    // 设置当前用户ID到会话变量
    await connection.execute('SET @current_user_id = ?', [currentUserId]);

    try {
      // 更新会员类型和剩余匹配次数
      await connection.execute(
        `UPDATE members 
        SET type = ?, 
            remaining_matches = CASE 
              WHEN ? = 'ONE_TIME' THEN 3 
              WHEN ? = 'ANNUAL' THEN 1 
              ELSE remaining_matches 
            END,
            updated_at = NOW() 
        WHERE id = ?`,
        [type, type, type, params.id]
      );

      // 存储支付信息
      if (type === 'ONE_TIME') {
        await connection.execute(
          'INSERT INTO member_one_time_info (member_id, payment_time) VALUES (?, ?)',
          [params.id, payment_time]
        );
      } else if (type === 'ANNUAL') {
        await connection.execute(
          'INSERT INTO member_annual_info (member_id, payment_time, expiry_time) VALUES (?, ?, ?)',
          [params.id, payment_time, expiry_time]
        );
      }

      // 记录类型变更
      await connection.execute(
        `INSERT INTO member_type_logs (
          member_id, old_type, new_type, payment_time, expiry_time, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [params.id, member.type, type, payment_time, expiry_time, notes]
      );

      await connection.commit();

      return NextResponse.json({ message: '会员升级成功' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('会员升级失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '会员升级失败' },
      { status: 500 }
    );
  }
}