import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { ensureWecomSidebarTables, verifySidebarAccess } from '@/lib/wecom-sidebar';

interface LastContactRow {
  wecom_userid: string;
  source: string;
  updated_at: string;
}

/**
 * GET /api/wecom-sidebar/last-contact?key=...
 * 读取该员工最后一次成功获取的客户 wecom_userid（DB 持久缓存）
 */
export async function GET(request: NextRequest) {
  try {
    const access = verifySidebarAccess(request);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: 401 });
    }

    const key = (request.nextUrl.searchParams.get('key') || '').trim();
    if (!key) {
      return NextResponse.json({ wecom_userid: null, source: null });
    }

    await ensureWecomSidebarTables();

    const [rows] = await executeQuery(
      `SELECT wecom_userid, source, updated_at
       FROM wecom_last_contact
       WHERE access_key = ?
       LIMIT 1`,
      [key]
    );

    const row = (rows as LastContactRow[])[0] || null;
    return NextResponse.json({
      success: true,
      wecom_userid: row?.wecom_userid || null,
      source: row?.source || null,
      updated_at: row?.updated_at || null
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '查询失败', wecom_userid: null },
      { status: 500 }
    );
  }
}

/**
 * POST /api/wecom-sidebar/last-contact
 * 保存（或更新）该员工最后一次客户 wecom_userid
 * Body: { wecom_userid: string, source?: 'auto' | 'manual' }
 */
export async function POST(request: NextRequest) {
  try {
    const access = verifySidebarAccess(request);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: 401 });
    }

    const key = (request.nextUrl.searchParams.get('key') || '').trim();
    if (!key) {
      return NextResponse.json({ error: 'key 必填' }, { status: 400 });
    }

    await ensureWecomSidebarTables();

    const body = (await request.json()) as { wecom_userid?: string; source?: string };
    const wecomUserid = (body.wecom_userid || '').trim();
    const source = (body.source || 'auto').trim();

    if (!wecomUserid) {
      return NextResponse.json({ error: 'wecom_userid 必填' }, { status: 400 });
    }

    await executeQuery(
      `INSERT INTO wecom_last_contact (access_key, wecom_userid, source)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         wecom_userid = VALUES(wecom_userid),
         source       = VALUES(source),
         updated_at   = NOW()`,
      [key, wecomUserid, source]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '保存失败' },
      { status: 500 }
    );
  }
}
