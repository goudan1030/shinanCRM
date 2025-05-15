import { NextResponse } from 'next/server';
import { pool } from '@/lib/mysql';
import { recordOperationLog, OperationType, TargetType, buildOperationDetail } from '@/lib/log-operations';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const data = await request.json() as { reason?: string; notes?: string };
    const { reason, notes } = data;

    // 获取当前用户ID和邮箱
    const currentUserId = request.headers.get('x-user-id');
    const userEmail = request.headers.get('x-user-email');
    
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

      // 记录状态变更到 member_operation_logs 表
      await connection.execute(
        `INSERT INTO member_operation_logs (
          member_id, operation_type, created_at, operator_id
        ) VALUES (?, ?, NOW(), ?)`,
        [
          params.id, 
          OperationType.ACTIVATE, 
          currentUserId
        ]
      );

      // 构建操作详情
      const detail = buildOperationDetail(
        '激活',
        member.nickname || member.member_no,
        reason ? `原因: ${reason}` : undefined
      );

      // 记录到全局操作日志
      await recordOperationLog(
        connection,
        OperationType.ACTIVATE,
        TargetType.MEMBER,
        params.id,
        currentUserId,
        detail,
        userEmail || undefined
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