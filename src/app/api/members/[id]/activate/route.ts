import { NextResponse } from 'next/server';
import { pool } from '@/lib/mysql';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const data = await request.json() as { reason?: string; notes?: string };
    
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

    try {
      // 获取当前会员状态和信息
      const [memberRows] = await connection.execute(
        'SELECT id, status, nickname, member_no FROM members WHERE id = ?',
        [params.id]
      );

      if (!memberRows || (memberRows as any[]).length === 0) {
        return NextResponse.json(
          { error: '会员不存在' },
          { status: 404 }
        );
      }

      const member = (memberRows as any[])[0];

      // 验证会员状态
      if (member.status !== 'REVOKED') {
        return NextResponse.json(
          { error: '只能激活已撤销的会员' },
          { status: 400 }
        );
      }

      // 更新会员状态
      await connection.execute(
        'UPDATE members SET status = ?, updated_at = NOW() WHERE id = ?',
        ['ACTIVE', params.id]
      );

      await connection.commit();

      return NextResponse.json({ message: '会员激活成功' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('会员激活失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '会员激活失败' },
      { status: 500 }
    );
  }
}