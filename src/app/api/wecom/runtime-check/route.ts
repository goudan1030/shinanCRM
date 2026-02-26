import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { getWecomConfig, getWecomAccessToken } from '@/lib/wecom-api';
import { ensureWecomSidebarTables } from '@/lib/wecom-sidebar';

type WecomConfigRow = {
  id?: number;
  corp_id?: string;
  agent_id?: string;
  secret?: string;
  token?: string;
  encoding_aes_key?: string;
  suite_id?: string;
  auth_corp_id?: string;
  app_type?: string;
  updated_at?: string;
};

function mask(value?: string | null, keep = 4): string | null {
  if (!value) return null;
  if (value.length <= keep) return '*'.repeat(value.length);
  return `${value.slice(0, keep)}***(${value.length})`;
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const expectedCorpId = request.nextUrl.searchParams.get('expected_corp_id') || '';
  const expectedAgentId = request.nextUrl.searchParams.get('expected_agent_id') || '';

  const result = {
    timestamp: new Date().toISOString(),
    checks: {
      database: { ok: false, error: '' },
      configRow: {
        ok: false,
        rowExists: false,
        corp_id: null as string | null,
        agent_id: null as string | null,
        has_secret: false,
        has_token: false,
        has_encoding_aes_key: false,
        updated_at: null as string | null,
        fallbackRisk: {
          messageRouteTokenFallback: false,
          reason: ''
        }
      },
      expectedMatch: {
        ok: false,
        expected_corp_id: expectedCorpId || null,
        expected_agent_id: expectedAgentId || null,
        corp_id_match: null as boolean | null,
        agent_id_match: null as boolean | null
      },
      helperConfig: {
        ok: false,
        reason: '',
        corp_id: null as string | null,
        agent_id: null as string | null
      },
      accessToken: {
        ok: false,
        token_preview: null as string | null,
        error: ''
      },
      agentGet: {
        ok: false,
        checked_agent_id: null as string | null,
        name: null as string | null,
        square_logo_url: null as string | null,
        error: ''
      },
      sidebar: {
        ok: false,
        has_access_key: Boolean(process.env.WECOM_SIDEBAR_ACCESS_KEY),
        tables_ready: false,
        bindings_count: 0,
        quick_replies_count: 0,
        error: ''
      }
    },
    summary: {
      overall_ok: false,
      active_corp_id: null as string | null,
      active_agent_id: null as string | null,
      elapsed_ms: 0
    }
  };

  try {
    // 1) 数据库连通性
    await executeQuery('SELECT 1 AS ok');
    result.checks.database.ok = true;

    // 2) 读取当前生效wecom_config
    const [configRows] = await executeQuery(
      `SELECT id, corp_id, agent_id, secret, token, encoding_aes_key, suite_id, auth_corp_id, app_type, updated_at
       FROM wecom_config
       ORDER BY id ASC
       LIMIT 1`
    );
    const configRow = (configRows as WecomConfigRow[])[0];
    if (configRow) {
      result.checks.configRow.ok = true;
      result.checks.configRow.rowExists = true;
      result.checks.configRow.corp_id = configRow.corp_id || null;
      result.checks.configRow.agent_id = configRow.agent_id || null;
      result.checks.configRow.has_secret = Boolean(configRow.secret && configRow.secret.trim());
      result.checks.configRow.has_token = Boolean(configRow.token && configRow.token.trim());
      result.checks.configRow.has_encoding_aes_key = Boolean(
        configRow.encoding_aes_key && configRow.encoding_aes_key.trim()
      );
      result.checks.configRow.updated_at = configRow.updated_at || null;
      result.checks.configRow.fallbackRisk.messageRouteTokenFallback =
        !result.checks.configRow.has_token;
      result.checks.configRow.fallbackRisk.reason = result.checks.configRow.has_token
        ? 'message路由将使用数据库token'
        : 'message路由将回退到内置token常量，建议在wecom_config设置token';

      result.summary.active_corp_id = configRow.corp_id || null;
      result.summary.active_agent_id = configRow.agent_id || null;
    }

    // 3) 期望值比对（用于排查是否还在走旧应用）
    if (expectedCorpId || expectedAgentId) {
      const corpMatch = expectedCorpId
        ? expectedCorpId === (result.checks.configRow.corp_id || '')
        : null;
      const agentMatch = expectedAgentId
        ? expectedAgentId === (result.checks.configRow.agent_id || '')
        : null;
      result.checks.expectedMatch.corp_id_match = corpMatch;
      result.checks.expectedMatch.agent_id_match = agentMatch;
      result.checks.expectedMatch.ok =
        (corpMatch === null || corpMatch) && (agentMatch === null || agentMatch);
    }

    // 4) 通过helper检查“系统实际可用配置”
    const helperConfig = await getWecomConfig();
    if (helperConfig) {
      result.checks.helperConfig.ok = true;
      result.checks.helperConfig.reason = 'getWecomConfig 可用';
      result.checks.helperConfig.corp_id = helperConfig.corp_id;
      result.checks.helperConfig.agent_id = helperConfig.agent_id;
    } else {
      result.checks.helperConfig.ok = false;
      result.checks.helperConfig.reason =
        'getWecomConfig 返回null（可能是配置缺失，或 member_notification_enabled 为 false）';
    }

    // 5) 获取access_token
    if (helperConfig) {
      const accessToken = await getWecomAccessToken(helperConfig);
      if (accessToken) {
        result.checks.accessToken.ok = true;
        result.checks.accessToken.token_preview = mask(accessToken, 8);

        // 6) 使用agent/get确认当前agent是否可访问
        const checkAgentId = expectedAgentId || helperConfig.agent_id;
        result.checks.agentGet.checked_agent_id = checkAgentId;
        try {
          const resp = await fetch(
            `https://qyapi.weixin.qq.com/cgi-bin/agent/get?access_token=${encodeURIComponent(
              accessToken
            )}&agentid=${encodeURIComponent(checkAgentId)}`
          );
          const data = (await resp.json()) as {
            errcode: number;
            errmsg: string;
            name?: string;
            square_logo_url?: string;
          };
          if (resp.ok && data.errcode === 0) {
            result.checks.agentGet.ok = true;
            result.checks.agentGet.name = data.name || null;
            result.checks.agentGet.square_logo_url = data.square_logo_url || null;
          } else {
            result.checks.agentGet.error = `agent/get失败: ${data.errcode} ${data.errmsg}`;
          }
        } catch (error) {
          result.checks.agentGet.error =
            error instanceof Error ? error.message : 'agent/get请求失败';
        }
      } else {
        result.checks.accessToken.error = '无法获取access_token';
      }
    }

    // 7) 侧边栏能力检查
    try {
      await ensureWecomSidebarTables();
      const [bindingRows] = await executeQuery('SELECT COUNT(*) AS total FROM wecom_user_bindings');
      const [replyRows] = await executeQuery('SELECT COUNT(*) AS total FROM wecom_quick_replies');
      result.checks.sidebar.tables_ready = true;
      result.checks.sidebar.bindings_count = Number(
        (bindingRows as Array<{ total: number }>)[0]?.total || 0
      );
      result.checks.sidebar.quick_replies_count = Number(
        (replyRows as Array<{ total: number }>)[0]?.total || 0
      );
      result.checks.sidebar.ok = true;
    } catch (error) {
      result.checks.sidebar.error = error instanceof Error ? error.message : '侧边栏检查失败';
    }

    result.summary.overall_ok =
      result.checks.database.ok &&
      result.checks.configRow.ok &&
      result.checks.accessToken.ok &&
      result.checks.agentGet.ok;
  } catch (error) {
    result.checks.database.error = error instanceof Error ? error.message : '数据库检查失败';
  } finally {
    result.summary.elapsed_ms = Date.now() - startedAt;
  }

  return NextResponse.json(result);
}
