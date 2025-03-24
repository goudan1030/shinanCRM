import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const data = await request.json();
    const { reason } = data;
    
    // 尝试将ID转换为数字类型
    // 如果是UUID格式的字符串，需要查找对应的数字ID
    let memberId: number;
    
    try {
      // 如果直接是数字字符串，转换为数字
      memberId = parseInt(params.id, 10);
      
      // 检查是否为有效的数字
      if (isNaN(memberId)) {
        throw new Error('无效的会员ID格式');
      }
    } catch (error) {
      // 如果不是有效的数字，假设是会员编号，尝试查找对应的ID
      const [memberRows] = await pool.execute(
        'SELECT id FROM members WHERE member_no = ?',
        [params.id]
      );
      
      if (!memberRows[0]) {
        return NextResponse.json(
          { error: '会员不存在' },
          { status: 404 }
        );
      }
      
      memberId = memberRows[0].id;
    }

    // 获取当前会员信息
    const [memberRows] = await pool.execute(
      'SELECT id, status FROM members WHERE id = ?',
      [memberId]
    );

    if (!memberRows[0]) {
      return NextResponse.json(
        { error: '会员不存在' },
        { status: 404 }
      );
    }

    const member = memberRows[0];
    
    // 确保使用数字类型的ID
    memberId = member.id;

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