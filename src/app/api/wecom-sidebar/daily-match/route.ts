import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { ensureWecomSidebarTables, findMemberByNumber, verifySidebarAccess } from '@/lib/wecom-sidebar';

interface MatchLogRow {
  id: number;
  wecom_userid: string;
  member_no: string;
  matched_member_no: string;
  match_date: string;
  notes: string | null;
  created_at: string;
}

/**
 * GET /api/wecom-sidebar/daily-match?key=...&member_no=M17534
 * 查询指定会员今天是否已匹配，如已匹配返回目标编号
 */
export async function GET(request: NextRequest) {
  try {
    const access = verifySidebarAccess(request);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: 401 });
    }

    await ensureWecomSidebarTables();

    const memberNo = (request.nextUrl.searchParams.get('member_no') || '').trim();
    if (!memberNo) {
      return NextResponse.json({ error: 'member_no 必填' }, { status: 400 });
    }

    const [rows] = await executeQuery(
      `SELECT id, member_no, matched_member_no, match_date, notes, created_at
       FROM wecom_match_logs
       WHERE member_no = ? AND match_date = CURDATE()
       LIMIT 1`,
      [memberNo]
    );

    const log = (rows as MatchLogRow[])[0] || null;
    return NextResponse.json({ success: true, matched: !!log, log });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '查询失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/wecom-sidebar/daily-match
 * 记录今日匹配（每个会员每天只能记录一次，重复提交返回已有记录）
 * Body: { wecom_userid, member_no, matched_member_no, notes? }
 */
export async function POST(request: NextRequest) {
  try {
    const access = verifySidebarAccess(request);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: 401 });
    }

    await ensureWecomSidebarTables();

    const body = (await request.json()) as {
      wecom_userid?: string;
      member_no?: string;
      matched_member_no?: string;
      notes?: string;
    };

    const wecomUserid = (body.wecom_userid || '').trim();
    const memberNo = (body.member_no || '').trim();
    const matchedMemberNo = (body.matched_member_no || '').trim().toUpperCase();

    if (!memberNo || !matchedMemberNo) {
      return NextResponse.json({ error: 'member_no 和 matched_member_no 必填' }, { status: 400 });
    }

    if (memberNo.toUpperCase() === matchedMemberNo) {
      return NextResponse.json({ error: '不能将会员匹配给自己' }, { status: 400 });
    }

    // 校验目标会员编号是否存在
    const targetMember = await findMemberByNumber(matchedMemberNo);
    if (!targetMember) {
      return NextResponse.json(
        { error: `目标会员 ${matchedMemberNo} 不存在，请确认编号` },
        { status: 404 }
      );
    }

    // 检查今天是否已有匹配记录（UNIQUE KEY: member_no + match_date）
    const [existRows] = await executeQuery(
      `SELECT id, matched_member_no FROM wecom_match_logs
       WHERE member_no = ? AND match_date = CURDATE() LIMIT 1`,
      [memberNo]
    );
    const existing = (existRows as Array<{ id: number; matched_member_no: string }>)[0];
    if (existing) {
      return NextResponse.json({
        success: false,
        alreadyMatched: true,
        matched_member_no: existing.matched_member_no,
        message: `今天已匹配编号 ${existing.matched_member_no}`
      });
    }

    // 插入记录
    await executeQuery(
      `INSERT INTO wecom_match_logs (wecom_userid, member_no, matched_member_no, match_date, notes)
       VALUES (?, ?, ?, CURDATE(), ?)`,
      [wecomUserid || '', memberNo, matchedMemberNo, body.notes?.trim() || null]
    );

    return NextResponse.json({
      success: true,
      message: `已记录：${memberNo} 今日匹配 ${matchedMemberNo}`,
      matched_member_no: matchedMemberNo
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '记录失败' },
      { status: 500 }
    );
  }
}
