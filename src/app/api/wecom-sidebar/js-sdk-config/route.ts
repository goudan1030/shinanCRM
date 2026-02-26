import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { executeQuery } from '@/lib/database-netlify';
import { getWecomAccessToken } from '@/lib/wecom-api';
import { verifySidebarAccess } from '@/lib/wecom-sidebar';

interface WecomConfigRow {
  corp_id: string;
  agent_id: string;
  secret: string;
}

interface WecomTicketResponse {
  errcode: number;
  errmsg: string;
  ticket?: string;
  expires_in?: number;
}

function sha1Sign(payload: string): string {
  return crypto.createHash('sha1').update(payload).digest('hex');
}

function normalizeUrl(raw: string): string {
  try {
    const parsed = new URL(raw);
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return raw.split('#')[0];
  }
}

async function getJsapiTicket(accessToken: string): Promise<string | null> {
  const resp = await fetch(
    `https://qyapi.weixin.qq.com/cgi-bin/get_jsapi_ticket?access_token=${encodeURIComponent(accessToken)}`
  );
  if (!resp.ok) return null;
  const data = (await resp.json()) as WecomTicketResponse;
  if (data.errcode !== 0 || !data.ticket) return null;
  return data.ticket;
}

async function getAgentConfigTicket(accessToken: string): Promise<string | null> {
  const resp = await fetch(
    `https://qyapi.weixin.qq.com/cgi-bin/ticket/get?access_token=${encodeURIComponent(
      accessToken
    )}&type=agent_config`
  );
  if (!resp.ok) return null;
  const data = (await resp.json()) as WecomTicketResponse;
  if (data.errcode !== 0 || !data.ticket) return null;
  return data.ticket;
}

export async function GET(request: NextRequest) {
  try {
    const access = verifySidebarAccess(request);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: 401 });
    }

    const rawUrl = (request.nextUrl.searchParams.get('url') || '').trim();
    if (!rawUrl) {
      return NextResponse.json({ error: 'url 参数必填' }, { status: 400 });
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

    const url = normalizeUrl(rawUrl);
    const jsapiTicket = await getJsapiTicket(accessToken);
    if (!jsapiTicket) {
      return NextResponse.json({ error: '获取jsapi_ticket失败' }, { status: 500 });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const nonceStr = crypto.randomBytes(8).toString('hex');
    const configSignature = sha1Sign(
      `jsapi_ticket=${jsapiTicket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`
    );

    const agentTicket = (await getAgentConfigTicket(accessToken)) || jsapiTicket;
    const agentTimestamp = Math.floor(Date.now() / 1000);
    const agentNonceStr = crypto.randomBytes(8).toString('hex');
    const agentSignature = sha1Sign(
      `jsapi_ticket=${agentTicket}&noncestr=${agentNonceStr}&timestamp=${agentTimestamp}&url=${url}`
    );

    return NextResponse.json({
      success: true,
      corpId: config.corp_id,
      agentId: config.agent_id,
      url,
      config: {
        timestamp,
        nonceStr,
        signature: configSignature
      },
      agentConfig: {
        timestamp: agentTimestamp,
        nonceStr: agentNonceStr,
        signature: agentSignature
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '生成企业微信JS-SDK配置失败' },
      { status: 500 }
    );
  }
}

