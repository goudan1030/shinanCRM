import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

export async function POST(request: Request) {
  try {
    const { memberId, targetMemberNo, matchedBy } = await request.json();

    // 验证必要参数
    if (!memberId || !targetMemberNo || !matchedBy) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 获取目标会员信息
    const [targetMember] = await pool.execute(
      'SELECT id, status FROM members WHERE member_no = ?',
      [targetMemberNo]
    );

    if (!targetMember.length) {
      return NextResponse.json(
        { error: '目标会员不存在' },
        { status: 404 }
      );
    }

    // 获取当前会员信息
    const [member] = await pool.execute(
      'SELECT type, status, remaining_matches FROM members WHERE id = ?',
      [memberId]
    );

    if (!member.length) {
      return NextResponse.json(
        { error: '会员不存在' },
        { status: 404 }
      );
    }

    const currentMember = member[0];
    const targetMemberData = targetMember[0];

    // 检查会员状态
    if (currentMember.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: '只能匹配激活状态的会员' },
        { status: 400 }
      );
    }

    if (targetMemberData.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: '目标会员未激活' },
        { status: 400 }
      );
    }

    // 检查是否为自己
    if (memberId === targetMemberData.id) {
      return NextResponse.json(
        { error: '不能与自己匹配' },
        { status: 400 }
      );
    }

    // 检查剩余匹配次数
    if (currentMember.remaining_matches <= 0) {
      return NextResponse.json(
        { error: '剩余匹配次数不足' },
        { status: 400 }
      );
    }

    // 检查是否已经匹配过
    const [existingMatch] = await pool.execute(
      'SELECT 1 FROM member_matches WHERE (member_id = ? AND target_member_id = ?) OR (member_id = ? AND target_member_id = ?)',
      [memberId, targetMemberData.id, targetMemberData.id, memberId]
    );

    if (existingMatch.length > 0) {
      return NextResponse.json(
        { error: '已经与该会员匹配过' },
        { status: 400 }
      );
    }

    // 创建匹配记录
    await pool.execute(
      'INSERT INTO member_matches (member_id, target_member_id, matched_by, match_no, match_time) VALUES (?, ?, ?, CONCAT("M", DATE_FORMAT(NOW(), "%Y%m%d"), LPAD(FLOOR(RAND() * 10000), 4, "0")), NOW())',
      [memberId, targetMemberData.id, matchedBy]
    );

    // 更新当前会员剩余匹配次数
    await pool.execute(
      'UPDATE members SET remaining_matches = remaining_matches - 1 WHERE id = ?',
      [memberId]
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('会员匹配失败:', error);
    return NextResponse.json(
      { error: '会员匹配失败' },
      { status: 500 }
    );
  }
}