import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { recordOperationLog, OperationType, TargetType, buildOperationDetail } from '@/lib/log-operations';

// 会员匹配
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    // 验证是否已登录
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const userEmail = (session.user as any).email;
    const { memberId1, memberId2, notes } = await request.json() as {
      memberId1: string,
      memberId2: string,
      notes?: string
    };

    // 验证参数
    if (!memberId1 || !memberId2) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    if (memberId1 === memberId2) {
      return NextResponse.json(
        { error: '不能匹配同一个会员' },
        { status: 400 }
      );
    }

    // 检查两个会员是否存在
    const [members1] = await pool.execute(
      'SELECT id, member_no, nickname, gender, remaining_matches FROM members WHERE id = ?',
      [memberId1]
    );

    const [members2] = await pool.execute(
      'SELECT id, member_no, nickname, gender, remaining_matches FROM members WHERE id = ?',
      [memberId2]
    );

    if ((members1 as any[]).length === 0) {
      return NextResponse.json(
        { error: '第一个会员不存在' },
        { status: 404 }
      );
    }

    if ((members2 as any[]).length === 0) {
      return NextResponse.json(
        { error: '第二个会员不存在' },
        { status: 404 }
      );
    }

    const member1 = (members1 as any[])[0];
    const member2 = (members2 as any[])[0];

    // 检查会员的匹配次数是否足够
    if (member1.remaining_matches <= 0) {
      return NextResponse.json(
        { error: `会员 ${member1.nickname || member1.member_no} 的匹配次数不足` },
        { status: 400 }
      );
    }

    if (member2.remaining_matches <= 0) {
      return NextResponse.json(
        { error: `会员 ${member2.nickname || member2.member_no} 的匹配次数不足` },
        { status: 400 }
      );
    }

    // 开始事务
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 创建匹配记录
      const [matchResult] = await connection.execute(
        `INSERT INTO member_matches (
          member_id1, member_id2, match_time, status, notes, created_at, created_by
        ) VALUES (?, ?, NOW(), 'ACTIVE', ?, NOW(), ?)`,
        [memberId1, memberId2, notes || null, userId]
      );

      const matchId = (matchResult as any).insertId;

      // 减少两个会员的匹配次数
      await connection.execute(
        'UPDATE members SET remaining_matches = remaining_matches - 1, updated_at = NOW() WHERE id = ?',
        [memberId1]
      );

      await connection.execute(
        'UPDATE members SET remaining_matches = remaining_matches - 1, updated_at = NOW() WHERE id = ?',
        [memberId2]
      );

      // 提交事务
      await connection.commit();

      // 记录会员1的匹配操作日志
      const detail1 = buildOperationDetail(
        '匹配',
        member1.nickname || member1.member_no,
        `与会员 ${member2.nickname || member2.member_no} 进行匹配，剩余匹配次数减1${notes ? `，备注: ${notes}` : ''}`
      );

      await recordOperationLog(
        pool,
        OperationType.MATCH,
        TargetType.MEMBER,
        memberId1,
        userId,
        detail1,
        userEmail
      );

      // 记录会员2的匹配操作日志
      const detail2 = buildOperationDetail(
        '匹配',
        member2.nickname || member2.member_no,
        `与会员 ${member1.nickname || member1.member_no} 进行匹配，剩余匹配次数减1${notes ? `，备注: ${notes}` : ''}`
      );

      await recordOperationLog(
        pool,
        OperationType.MATCH,
        TargetType.MEMBER,
        memberId2,
        userId,
        detail2,
        userEmail
      );

      return NextResponse.json({
        success: true,
        message: '匹配成功',
        matchId: matchId
      });
    } catch (error) {
      // 回滚事务
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('会员匹配失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '匹配失败' },
      { status: 500 }
    );
  }
}