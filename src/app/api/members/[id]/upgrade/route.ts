import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { recordOperationLog, OperationType, TargetType, buildOperationDetail } from '@/lib/log-operations';

// 会员升级
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    const { type, remainingMatches, reason } = await request.json() as { 
      type: 'NORMAL' | 'ANNUAL',
      remainingMatches?: number,
      reason?: string
    };

    // 验证类型参数
    if (!type || !['NORMAL', 'ANNUAL'].includes(type)) {
      return NextResponse.json(
        { error: '无效的会员类型' },
        { status: 400 }
      );
    }

    // 获取会员ID
    const memberId = params.id;
    
    // 先查询会员信息，用于记录日志
    const [members] = await pool.execute(
      'SELECT member_no, nickname, type, remaining_matches FROM members WHERE id = ?',
      [memberId]
    );

    if ((members as any[]).length === 0) {
      return NextResponse.json(
        { error: '会员不存在' },
        { status: 404 }
      );
    }

    const member = (members as any[])[0];
    
    // 如果当前类型与目标类型相同，但需要调整匹配次数
    if (member.type === type && typeof remainingMatches === 'number') {
      // 更新会员匹配次数
      await pool.execute(
        'UPDATE members SET remaining_matches = ?, updated_at = NOW() WHERE id = ?',
        [remainingMatches, memberId]
      );
      
      // 构建操作详情
      const detail = buildOperationDetail(
        '调整匹配次数',
        member.nickname || member.member_no,
        `从 ${member.remaining_matches || 0} 次调整到 ${remainingMatches} 次${reason ? `，原因: ${reason}` : ''}`
      );

      // 记录操作日志
      await recordOperationLog(
        pool,
        OperationType.UPGRADE,
        TargetType.MEMBER,
        memberId,
        userId,
        detail,
        userEmail
      );

      return NextResponse.json({
        success: true,
        message: `会员匹配次数已调整为 ${remainingMatches} 次`
      });
    }
    
    // 如果当前类型与目标类型相同，无需修改类型
    if (member.type === type && typeof remainingMatches !== 'number') {
      return NextResponse.json({
        success: true,
        message: `会员已经是${type === 'ANNUAL' ? '年费' : '普通'}会员`
      });
    }

    // 确定新的匹配次数
    let newRemainingMatches = member.remaining_matches;
    if (typeof remainingMatches === 'number') {
      newRemainingMatches = remainingMatches;
    } else if (type === 'ANNUAL') {
      // 升级为年费会员默认增加匹配次数
      newRemainingMatches = (member.remaining_matches || 0) + 5;
    }

    // 更新会员类型和匹配次数
    await pool.execute(
      'UPDATE members SET type = ?, remaining_matches = ?, updated_at = NOW() WHERE id = ?',
      [type, newRemainingMatches, memberId]
    );
    
    // 构建操作详情
    const fromType = member.type === 'NORMAL' ? '普通会员' : '年费会员';
    const toType = type === 'NORMAL' ? '普通会员' : '年费会员';
    const detail = buildOperationDetail(
      '升级',
      member.nickname || member.member_no,
      `从 ${fromType} 升级为 ${toType}，匹配次数从 ${member.remaining_matches || 0} 次调整到 ${newRemainingMatches} 次${reason ? `，原因: ${reason}` : ''}`
    );

    // 记录操作日志
    await recordOperationLog(
      pool,
      OperationType.UPGRADE,
      TargetType.MEMBER,
      memberId,
      userId,
      detail,
      userEmail
    );

    return NextResponse.json({
      success: true,
      message: `会员已升级为${type === 'ANNUAL' ? '年费' : '普通'}会员，匹配次数为 ${newRemainingMatches} 次`
    });

  } catch (error) {
    console.error('会员升级失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '升级失败' },
      { status: 500 }
    );
  }
}