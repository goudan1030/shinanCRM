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
  status: number;
}

// 获取快捷回复列表（侧边栏用 status=1，管理后台传 all=1 可获取全部）
export async function GET(request: NextRequest) {
  try {
    const access = verifySidebarAccess(request);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: 401 });
    }

    await ensureWecomSidebarTables();

    const showAll = request.nextUrl.searchParams.get('all') === '1';

    const [rows] = await executeQuery(
      showAll
        ? `SELECT id, category, title, trigger_text, reply_content, sort_order, status
           FROM wecom_quick_replies
           ORDER BY category ASC, sort_order ASC, id ASC`
        : `SELECT id, category, title, trigger_text, reply_content, sort_order, status
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

// 新增或更新快捷回复（有 id 则更新，无 id 则新增）
export async function POST(request: NextRequest) {
  try {
    const access = verifySidebarAccess(request);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: 401 });
    }

    await ensureWecomSidebarTables();

    const body = (await request.json()) as {
      id?: number;
      category?: string;
      title?: string;
      trigger_text?: string | null;
      reply_content?: string;
      sort_order?: number;
      status?: number;
    };

    const { id, category, title, trigger_text, reply_content, sort_order, status } = body;

    if (!title?.trim() || !reply_content?.trim()) {
      return NextResponse.json({ error: 'title 和 reply_content 必填' }, { status: 400 });
    }

    if (id) {
      await executeQuery(
        `UPDATE wecom_quick_replies
         SET category = ?, title = ?, trigger_text = ?, reply_content = ?,
             sort_order = ?, status = ?, updated_at = NOW()
         WHERE id = ?`,
        [
          category?.trim() || '默认',
          title.trim(),
          trigger_text?.trim() || null,
          reply_content.trim(),
          sort_order ?? 0,
          status ?? 1,
          id
        ]
      );
      return NextResponse.json({ success: true, id });
    } else {
      const [result] = await executeQuery(
        `INSERT INTO wecom_quick_replies (category, title, trigger_text, reply_content, sort_order, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          category?.trim() || '默认',
          title.trim(),
          trigger_text?.trim() || null,
          reply_content.trim(),
          sort_order ?? 0,
          status ?? 1
        ]
      );
      const insertId = (result as any).insertId;
      return NextResponse.json({ success: true, id: insertId });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '保存快捷回复失败' },
      { status: 500 }
    );
  }
}

// 删除快捷回复（软删除 status=0 或硬删除）
export async function DELETE(request: NextRequest) {
  try {
    const access = verifySidebarAccess(request);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id 必填' }, { status: 400 });
    }

    await executeQuery(
      `UPDATE wecom_quick_replies SET status = 0, updated_at = NOW() WHERE id = ?`,
      [id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除快捷回复失败' },
      { status: 500 }
    );
  }
}
