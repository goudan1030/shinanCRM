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
  city: string | null;
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
       ('开场', '开场问候', '你好', '您好，我是新星CRM顾问，很高兴为您服务。', 10, 1),
       ('流程', '沟通流程说明', '流程', '我们先了解您的基本需求，然后匹配合适方案，最后安排一对一服务。', 20, 1),
       ('价格', '收费说明', '费用', '具体费用会根据服务类型和周期确定，您可以先告诉我需求，我给您详细报价。', 30, 1),
       ('资料', '资料补充提醒', '资料', '为了更快帮您匹配，请补充：年龄、城市、职业、目标需求。', 40, 1),
       ('结束', '结束语', '感谢', '感谢您的沟通，如需继续咨询随时联系我。', 50, 1)`
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

  return { ok: false, message: '访问密钥无效' };
}

export async function findMemberByNumber(memberNo: string): Promise<SidebarMember | null> {
  const normalized = memberNo.trim();
  if (!normalized) return null;

  const [rows] = await executeQuery(
    `SELECT id, member_no, nickname, phone, wechat, gender, type, status, city, created_at, updated_at
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
