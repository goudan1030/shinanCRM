import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { getWecomAccessToken, sendWecomMessageDetailed } from '@/lib/wecom-api';
import { ensureWecomSidebarTables, verifySidebarAccess } from '@/lib/wecom-sidebar';

interface WecomConfigRow {
  corp_id: string;
  agent_id: string;
  secret: string;
}

export async function POST(request: NextRequest) {
  try {
    const access = verifySidebarAccess(request);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: 401 });
    }

    await ensureWecomSidebarTables();

    const body = (await request.json()) as { to_userid?: string; content?: string };
    const toUserId = (body.to_userid || '').trim();
    const content = (body.content || '').trim();

    if (!toUserId || !content) {
      return NextResponse.json({ error: 'to_userid 与 content 必填' }, { status: 400 });
    }

    const [rows] = await executeQuery(
      `SELECT corp_id, agent_id, secret
       FROM wecom_config
       WHERE id = 1
       LIMIT 1`
    );
    const config = (rows as WecomConfigRow[])[0];

    if (!config?.corp_id || !config?.agent_id || !config?.secret) {
      return NextResponse.json({ error: '企业微信配置不完整' }, { status: 500 });
    }

    const accessToken = await getWecomAccessToken({
      corp_id: config.corp_id,
      agent_id: config.agent_id,
      secret: config.secret
    });
    if (!accessToken) {
      return NextResponse.json({ error: '获取企业微信access_token失败' }, { status: 500 });
    }

    const result = await sendWecomMessageDetailed(accessToken, {
      touser: toUserId,
      msgtype: 'text',
      agentid: config.agent_id,
      text: { content }
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || '发送失败', errorCode: result.errorCode },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '发送快捷回复失败' },
      { status: 500 }
    );
  }
}
