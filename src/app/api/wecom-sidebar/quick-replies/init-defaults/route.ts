import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { ensureWecomSidebarTables, verifySidebarAccess } from '@/lib/wecom-sidebar';

const DEFAULT_QUICK_REPLIES = [
  {
    category: '基础',
    title: '付费提示',
    trigger_text: '付费',
    reply_content: '你好，付费会员制平台，先付费后服务，不提供免费服务。',
    sort_order: 10
  },
  {
    category: '基础',
    title: '资料确认',
    trigger_text: '资料',
    reply_content:
      '这是你的资料，请确认，有需要修改请在平台更新，首次更新免费。系统会自动推送，没有问题后将进行推送及服务。',
    sort_order: 20
  },
  {
    category: '跟进',
    title: '联系文案',
    trigger_text: '联系',
    reply_content: `已经联系对方，对方同意后会互推微信，
-----------------------------------------------------------------
🧡[为什么没有动静]
没有动静说明对方没有回复，请耐心等待。就算对方拒绝我们也会告知。
🧡[会员权益]会员用户超过24小时未回复，想自己尝试添加请主动找我要微信，默认不推送。`,
    sort_order: 30
  },
  {
    category: '跟进',
    title: '匹配文案',
    trigger_text: '匹配',
    reply_content: `这位对你的资料感兴趣想跟你接触看看，请问方便互推微信吗？「不合适请告知具体原因」哦，我们需要回复对方

【#请注意，超过24小时不回复默认推送微信，超过3次不回复，以后认识需要按照标准进行收费。】`,
    sort_order: 40
  }
];

/**
 * POST /api/wecom-sidebar/quick-replies/init-defaults
 * 将默认业务模板写入数据库（已存在同名则更新内容，不存在则新增）
 * 不影响用户自定义的其他快捷回复
 */
export async function POST(request: NextRequest) {
  try {
    const access = verifySidebarAccess(request);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: 401 });
    }

    await ensureWecomSidebarTables();

    let upserted = 0;
    let inserted = 0;

    for (const tpl of DEFAULT_QUICK_REPLIES) {
      // 按 title 查找现有记录（包含已禁用的）
      const [existing] = await executeQuery(
        `SELECT id FROM wecom_quick_replies WHERE title = ? LIMIT 1`,
        [tpl.title]
      );
      const rows = existing as Array<{ id: number }>;

      if (rows.length > 0) {
        await executeQuery(
          `UPDATE wecom_quick_replies
           SET category = ?, trigger_text = ?, reply_content = ?,
               sort_order = ?, status = 1, updated_at = NOW()
           WHERE id = ?`,
          [tpl.category, tpl.trigger_text, tpl.reply_content, tpl.sort_order, rows[0].id]
        );
        upserted++;
      } else {
        await executeQuery(
          `INSERT INTO wecom_quick_replies (category, title, trigger_text, reply_content, sort_order, status)
           VALUES (?, ?, ?, ?, ?, 1)`,
          [tpl.category, tpl.title, tpl.trigger_text, tpl.reply_content, tpl.sort_order]
        );
        inserted++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `初始化完成：新增 ${inserted} 条，更新 ${upserted} 条`,
      total: DEFAULT_QUICK_REPLIES.length
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '初始化失败' },
      { status: 500 }
    );
  }
}
