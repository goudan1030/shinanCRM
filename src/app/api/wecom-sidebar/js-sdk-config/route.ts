import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { executeQuery } from '@/lib/database-netlify';
import { getWecomAccessToken } from '@/lib/wecom-api';
import { ensureWecomSidebarTables, verifySidebarAccess } from '@/lib/wecom-sidebar';

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

// ---- 数据库缓存（跨 Serverless 实例持久化，避免 jsapi_ticket 限流） ----

const TOKEN_CACHE_KEY = 'wecom:access_token';
const JSAPI_TICKET_CACHE_KEY = 'wecom:jsapi_ticket';
const AGENT_TICKET_CACHE_KEY = 'wecom:agent_ticket';
/** 在过期前 5 分钟就刷新，避免边界问题 */
const REFRESH_BUFFER = 300;

async function getCached(key: string): Promise<string | null> {
  try {
    const [rows] = await executeQuery(
      `SELECT cache_value FROM wecom_api_cache
       WHERE cache_key = ? AND expires_at > (UNIX_TIMESTAMP() + ?)
       LIMIT 1`,
      [key, REFRESH_BUFFER]
    );
    return (rows as Array<{ cache_value: string }>)[0]?.cache_value || null;
  } catch {
    return null;
  }
}

async function setCache(key: string, value: string, expiresInSeconds: number): Promise<void> {
  try {
    await executeQuery(
      `INSERT INTO wecom_api_cache (cache_key, cache_value, expires_at)
       VALUES (?, ?, UNIX_TIMESTAMP() + ?)
       ON DUPLICATE KEY UPDATE
         cache_value = VALUES(cache_value),
         expires_at  = VALUES(expires_at)`,
      [key, value, expiresInSeconds]
    );
  } catch {
    // 缓存写失败不影响主流程
  }
}

// ---- 企业微信 API ----

async function fetchJsapiTicket(accessToken: string): Promise<{ ticket: string | null; errcode?: number; errmsg?: string }> {
  const resp = await fetch(
    `https://qyapi.weixin.qq.com/cgi-bin/get_jsapi_ticket?access_token=${encodeURIComponent(accessToken)}`
  );
  if (!resp.ok) return { ticket: null, errmsg: `HTTP ${resp.status}` };
  const data = (await resp.json()) as WecomTicketResponse;
  if (data.errcode !== 0 || !data.ticket) {
    return { ticket: null, errcode: data.errcode, errmsg: data.errmsg };
  }
  return { ticket: data.ticket };
}

async function fetchAgentTicket(accessToken: string): Promise<{ ticket: string | null; errcode?: number; errmsg?: string }> {
  const resp = await fetch(
    `https://qyapi.weixin.qq.com/cgi-bin/ticket/get?access_token=${encodeURIComponent(accessToken)}&type=agent_config`
  );
  if (!resp.ok) return { ticket: null, errmsg: `HTTP ${resp.status}` };
  const data = (await resp.json()) as WecomTicketResponse;
  if (data.errcode !== 0 || !data.ticket) {
    return { ticket: null, errcode: data.errcode, errmsg: data.errmsg };
  }
  return { ticket: data.ticket };
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

// ---- 带缓存的 token/ticket 获取 ----

async function getAccessTokenCached(config: WecomConfigRow): Promise<string> {
  const cached = await getCached(TOKEN_CACHE_KEY);
  if (cached) return cached;

  const token = await getWecomAccessToken({
    corp_id: config.corp_id,
    agent_id: config.agent_id,
    secret: config.secret
  });
  if (!token) throw new Error('获取 access_token 失败，请检查企业微信配置（corp_id / secret）');

  await setCache(TOKEN_CACHE_KEY, token, 7200 - REFRESH_BUFFER);
  return token;
}

async function getJsapiTicketCached(accessToken: string): Promise<string> {
  const cached = await getCached(JSAPI_TICKET_CACHE_KEY);
  if (cached) return cached;

  const { ticket, errcode, errmsg } = await fetchJsapiTicket(accessToken);
  if (!ticket) {
    // errcode 45009 = API 调用超过限制（每天 2000 次）
    const hint = errcode === 45009
      ? '（errcode 45009：今日 jsapi_ticket 接口调用次数超限，明天自动恢复）'
      : errcode ? `（errcode ${errcode}: ${errmsg}）` : '';
    throw new Error(`获取 jsapi_ticket 失败 ${hint}`);
  }

  await setCache(JSAPI_TICKET_CACHE_KEY, ticket, 7200 - REFRESH_BUFFER);
  return ticket;
}

async function getAgentTicketCached(accessToken: string): Promise<string | null> {
  const cached = await getCached(AGENT_TICKET_CACHE_KEY);
  if (cached) return cached;

  const { ticket } = await fetchAgentTicket(accessToken);
  if (!ticket) return null;

  await setCache(AGENT_TICKET_CACHE_KEY, ticket, 7200 - REFRESH_BUFFER);
  return ticket;
}

// ---- API Route ----

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

    // 确保缓存表已建
    await ensureWecomSidebarTables();

    const [rows] = await executeQuery(
      `SELECT corp_id, agent_id, secret FROM wecom_config WHERE id = 1 LIMIT 1`
    );
    const config = (rows as WecomConfigRow[])[0];
    if (!config?.corp_id || !config?.agent_id || !config?.secret) {
      return NextResponse.json({ error: '企业微信配置不完整，请在后台填写 corp_id / agent_id / secret' }, { status: 500 });
    }

    // 带缓存获取 token + ticket，大幅减少对微信 API 的调用次数
    const accessToken = await getAccessTokenCached(config);
    const jsapiTicket = await getJsapiTicketCached(accessToken);
    const agentTicket = (await getAgentTicketCached(accessToken)) || jsapiTicket;

    const url = normalizeUrl(rawUrl);
    const timestamp = Math.floor(Date.now() / 1000);
    const nonceStr = crypto.randomBytes(8).toString('hex');
    const configSignature = sha1Sign(
      `jsapi_ticket=${jsapiTicket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`
    );

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
      config: { timestamp, nonceStr, signature: configSignature },
      agentConfig: { timestamp: agentTimestamp, nonceStr: agentNonceStr, signature: agentSignature }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '生成企业微信JS-SDK配置失败' },
      { status: 500 }
    );
  }
}
