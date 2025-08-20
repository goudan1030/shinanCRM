import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';

export async function POST(request: Request) {
  try {
    const { memberId1, memberId2, notes } = await request.json();
    
    // 获取当前用户ID
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: '未获取到操作人信息' },
        { status: 401 }
      );
    }

    if (!memberId1 || !memberId2) {
      return NextResponse.json(
        { error: '请选择两个会员进行匹配' },
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
    const [members1] = await executeQuery(
      'SELECT id, member_no, nickname, gender, remaining_matches FROM members WHERE id = ?',
      [memberId1]
    );

    const [members2] = await executeQuery(
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

    // 创建匹配记录
    const [matchResult] = await executeQuery(
      `INSERT INTO member_matches (
        member_id1, member_id2, match_time, status, notes, created_at, created_by
      ) VALUES (?, ?, NOW(), 'ACTIVE', ?, NOW(), ?)`,
      [memberId1, memberId2, notes || null, userId]
    );

    const matchId = (matchResult as any).insertId;

    // 减少两个会员的匹配次数
    await executeQuery(
      'UPDATE members SET remaining_matches = remaining_matches - 1, updated_at = NOW() WHERE id = ?',
      [memberId1]
    );

    await executeQuery(
      'UPDATE members SET remaining_matches = remaining_matches - 1, updated_at = NOW() WHERE id = ?',
      [memberId2]
    );

    return NextResponse.json({
      success: true,
      message: '匹配成功',
      matchId: matchId,
      match: {
        member1: {
          id: member1.id,
          member_no: member1.member_no,
          nickname: member1.nickname,
          remaining_matches: member1.remaining_matches - 1
        },
        member2: {
          id: member2.id,
          member_no: member2.member_no,
          nickname: member2.nickname,
          remaining_matches: member2.remaining_matches - 1
        }
      }
    });

  } catch (error) {
    console.error('会员匹配失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '匹配失败' },
      { status: 500 }
    );
  }
}