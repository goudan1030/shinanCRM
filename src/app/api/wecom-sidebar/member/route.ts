import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import {
  ensureWecomSidebarTables,
  findMemberByNumber,
  verifySidebarAccess,
  type SidebarMember
} from '@/lib/wecom-sidebar';

interface BindingRow {
  wecom_userid: string;
  member_id: number | null;
  member_no: string | null;
  bind_status: number;
  remark: string | null;
  updated_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const access = verifySidebarAccess(request);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: 401 });
    }

    await ensureWecomSidebarTables();

    const memberNo = (request.nextUrl.searchParams.get('member_no') || '').trim();
    const detail =
      request.nextUrl.searchParams.get('detail') === '1' ||
      request.nextUrl.searchParams.get('detail') === 'true';
    const wecomUserId = (request.nextUrl.searchParams.get('wecom_userid') || '').trim();

    if (memberNo) {
      const member = await findMemberByNumber(memberNo, { detail });
      return NextResponse.json({ success: true, member, source: 'member_no' });
    }

    if (!wecomUserId) {
      return NextResponse.json(
        { error: '请提供 wecom_userid 或 member_no' },
        { status: 400 }
      );
    }

    const [bindingRows] = await executeQuery(
      `SELECT wecom_userid, member_id, member_no, bind_status, remark, updated_at
       FROM wecom_user_bindings
       WHERE wecom_userid = ? AND bind_status = 1
       LIMIT 1`,
      [wecomUserId]
    );

    const binding = (bindingRows as BindingRow[])[0] || null;
    if (!binding || !binding.member_no) {
      return NextResponse.json({
        success: true,
        member: null,
        binding: null,
        source: 'wecom_userid'
      });
    }

    const member = await findMemberByNumber(binding.member_no, { detail });
    return NextResponse.json({
      success: true,
      member: member as SidebarMember | null,
      binding,
      source: 'wecom_userid'
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '查询会员信息失败' },
      { status: 500 }
    );
  }
}
