import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { ensureWecomSidebarTables, findMemberByNumber, verifySidebarAccess } from '@/lib/wecom-sidebar';

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
      remark?: string;
    };

    const wecomUserId = (body.wecom_userid || '').trim();
    const memberNo = (body.member_no || '').trim().toUpperCase();

    if (!wecomUserId || !memberNo) {
      return NextResponse.json(
        { error: 'wecom_userid 与 member_no 必填' },
        { status: 400 }
      );
    }

    const member = await findMemberByNumber(memberNo);
    if (!member) {
      return NextResponse.json({ error: '未找到对应会员编号' }, { status: 404 });
    }

    await executeQuery(
      `INSERT INTO wecom_user_bindings (
        wecom_userid, member_id, member_no, bind_status, bind_source, remark
      ) VALUES (?, ?, ?, 1, 'sidebar', ?)
      ON DUPLICATE KEY UPDATE
        member_id = VALUES(member_id),
        member_no = VALUES(member_no),
        bind_status = 1,
        bind_source = 'sidebar',
        remark = VALUES(remark),
        updated_at = NOW()`,
      [wecomUserId, member.id, member.member_no, body.remark || null]
    );

    return NextResponse.json({
      success: true,
      binding: {
        wecom_userid: wecomUserId,
        member_id: member.id,
        member_no: member.member_no
      },
      member
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '绑定失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const access = verifySidebarAccess(request);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: 401 });
    }

    await ensureWecomSidebarTables();

    const wecomUserId = (request.nextUrl.searchParams.get('wecom_userid') || '').trim();
    if (!wecomUserId) {
      return NextResponse.json({ error: 'wecom_userid 必填' }, { status: 400 });
    }

    await executeQuery(
      `UPDATE wecom_user_bindings
       SET bind_status = 0, updated_at = NOW()
       WHERE wecom_userid = ?`,
      [wecomUserId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '解绑失败' },
      { status: 500 }
    );
  }
}
