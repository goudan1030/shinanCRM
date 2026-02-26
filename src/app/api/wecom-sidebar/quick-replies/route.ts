import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { ensureWecomSidebarTables, verifySidebarAccess } from '@/lib/wecom-sidebar';

interface QuickReplyRow {
  id: number;
  category: string;
  title: string;
  trigger_text: string | null;
  reply_content: string;
  sort_order: number;
}

export async function GET(request: NextRequest) {
  try {
    const access = verifySidebarAccess(request);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: 401 });
    }

    await ensureWecomSidebarTables();

    const [rows] = await executeQuery(
      `SELECT id, category, title, trigger_text, reply_content, sort_order
       FROM wecom_quick_replies
       WHERE status = 1
       ORDER BY category ASC, sort_order ASC, id ASC`
    );

    const list = rows as QuickReplyRow[];
    return NextResponse.json({ success: true, list });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取快捷回复失败' },
      { status: 500 }
    );
  }
}
