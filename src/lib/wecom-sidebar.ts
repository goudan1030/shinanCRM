import type { NextRequest } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';

let tablesEnsured = false;

export interface SidebarMember {
  id: number;
  member_no: string;
  nickname: string | null;
  phone: string | null;
  wechat: string | null;
  gender: string | null;
  type: string | null;
  status: string | null;
  province?: string | null;
  city: string | null;
  district?: string | null;
  target_area?: string | null;
  birth_year?: number | null;
  height?: number | null;
  weight?: number | null;
  education?: string | null;
  occupation?: string | null;
  house_car?: string | null;
  hukou_province?: string | null;
  hukou_city?: string | null;
  children_plan?: string | null;
  marriage_cert?: string | null;
  marriage_history?: string | null;
  sexual_orientation?: string | null;
  self_description?: string | null;
  partner_requirement?: string | null;
  remaining_matches?: number | null;
  created_at: string;
  updated_at: string;
}

export async function ensureWecomSidebarTables(): Promise<void> {
  if (tablesEnsured) return;

  await executeQuery(`
    CREATE TABLE IF NOT EXISTS wecom_user_bindings (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      wecom_userid VARCHAR(128) NOT NULL,
      member_id BIGINT NULL,
      member_no VARCHAR(64) NULL,
      bind_status TINYINT NOT NULL DEFAULT 1 COMMENT '1=已绑定,0=解绑',
      bind_source VARCHAR(32) NOT NULL DEFAULT 'sidebar' COMMENT 'sidebar|manual|command',
      remark VARCHAR(255) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_wecom_userid (wecom_userid),
      KEY idx_member_id (member_id),
      KEY idx_member_no (member_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await executeQuery(`
    CREATE TABLE IF NOT EXISTS wecom_quick_replies (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      category VARCHAR(64) NOT NULL DEFAULT '默认',
      title VARCHAR(100) NOT NULL,
      trigger_text VARCHAR(100) NULL,
      reply_content TEXT NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      status TINYINT NOT NULL DEFAULT 1 COMMENT '1启用 0禁用',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_status_sort (status, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [rows] = await executeQuery(
    'SELECT COUNT(*) AS total FROM wecom_quick_replies WHERE status = 1'
  );
  const total = Number((rows as Array<{ total: number }>)[0]?.total || 0);

  if (total === 0) {
    await executeQuery(
      `INSERT INTO wecom_quick_replies (category, title, trigger_text, reply_content, sort_order, status)
       VALUES
       ('基础', '付费提示', '付费', '你好，付费会员制平台，先付费后服务，不提供免费服务。', 10, 1),
       ('基础', '资料确认', '资料', '这是你的资料，请确认，有需要修改请在平台更新，首次更新免费。系统会自动推送，没有问题后将进行推送及服务。', 20, 1),
       ('跟进', '联系文案', '联系', '已经联系对方，对方同意后会互推微信，\n-----------------------------------------------------------------\n🧡[为什么没有动静]\n没有动静说明对方没有回复，请耐心等待。就算对方拒绝我们也会告知。\n🧡[会员权益]会员用户超过24小时未回复，想自己尝试添加请主动找我要微信，默认不推送。', 30, 1),
       ('跟进', '匹配文案', '匹配', '这位对你的资料感兴趣想跟你接触看看，请问方便互推微信吗？「不合适请告知具体原因」哦，我们需要回复对方\n\n【#请注意，超过24小时不回复默认推送微信，超过3次不回复，以后认识需要按照标准进行收费。】', 40, 1)`
    );
  }

  tablesEnsured = true;
}

export function verifySidebarAccess(request: NextRequest): { ok: boolean; message?: string } {
  const requiredKey = process.env.WECOM_SIDEBAR_ACCESS_KEY?.trim();
  if (!requiredKey) {
    return { ok: true };
  }

  const urlKey = request.nextUrl.searchParams.get('key') || '';
  const headerKey = request.headers.get('x-wecom-sidebar-key') || '';

  if (urlKey === requiredKey || headerKey === requiredKey) {
    return { ok: true };
  }

  // 兜底：允许来自当前站点侧边栏页面的同源请求，避免企业微信后台URL未携带key时全部失效
  const referer = request.headers.get('referer') || '';
  const host = request.headers.get('host') || '';
  const refererIsSidebar =
    referer.includes('/wecom-sidebar') &&
    (host ? referer.includes(host) : referer.startsWith(request.nextUrl.origin));
  if (refererIsSidebar) {
    return { ok: true };
  }

  return { ok: false, message: '访问密钥无效' };
}

export async function findMemberByNumber(
  memberNo: string,
  options?: { detail?: boolean }
): Promise<SidebarMember | null> {
  const normalized = memberNo.trim();
  if (!normalized) return null;

  const selectFields = options?.detail
    ? `id, member_no, nickname, phone, wechat, gender, type, status,
       province, city, district, target_area, birth_year, height, weight,
       education, occupation, house_car, hukou_province, hukou_city,
       children_plan, marriage_cert, marriage_history, sexual_orientation,
       self_description, partner_requirement, remaining_matches, created_at, updated_at`
    : 'id, member_no, nickname, phone, wechat, gender, type, status, city, created_at, updated_at';

  const [rows] = await executeQuery(
    `SELECT ${selectFields}
     FROM members
     WHERE deleted = 0
       AND (member_no = ? OR UPPER(member_no) = ? OR member_no LIKE ?)
     ORDER BY member_no = ? DESC, UPPER(member_no) = ? DESC
     LIMIT 1`,
    [normalized, normalized.toUpperCase(), `%${normalized}%`, normalized, normalized.toUpperCase()]
  );

  const list = rows as SidebarMember[];
  return list[0] || null;
}
