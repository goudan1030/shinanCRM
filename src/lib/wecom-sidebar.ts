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
    const defaultReplies = [
      ['销售', '优惠说明', '优惠', '需要开通吗，咨询当天开通享优惠，年费优惠99或者额外赠送一个月时长。', 10],
      ['销售', '付费确认', '付费', '有需要吗，不接受付费请告知互删，企业微信好友位需要从官方购买，好友位不多。', 20],
      ['详情', '收费说明', '收费', '形婚互助圈（石楠文化）拥有7年形婚平台服务经验，是专业的形婚信息匹配平台，服务近25000+用户，年平均成功案例近500对；\n\n下面是权益二选一(签订正规服务合同）：\n1⃣、1299年费会员，开通会员后会按照会员权益进行推送发布，每天可以找我认识一位你想认识的女生，提供对方编号即可；\n2⃣、489元/3次，按次匹配服务，互推微信名片后才扣次数，不成功不扣。\n\n会员将会进入会员群，每天群内单独发布女生信息\n服务时间：8:30-19:30，周末及节假日休息\n\n1⃣、了解我们平台，请点击：https://mp.weixin.qq.com/s/2wHha3CRpJQ8HpcuwKdKOQ\n\n2⃣、了解2024年我们的成功案例（部分），请点击：https://mp.weixin.qq.com/s/KfuwEJ3SHH9qmdIEdcC7nQ\n\n女生服务：\n1、每周可以免费主动联系认识一位男生\n2、男生联系女生免费，不限制次数\n3、超过3次不回复不再提供免费服务🌟', 30],
      ['服务', '资料确认', '资料', '这是你的资料，请确认，有需要修改请在平台更新，首次更新免费。系统会自动推送，没有问题后将进行推送及服务。', 40],
      ['服务', '合同告知', '合同', '这是合同，点击在线签署即可。', 50],
      ['服务', '付费告知', '支付', '扫码开通即可，这是我们公司的支付宝，完成后提供下截图我们登记。', 60]
    ];
    for (const row of defaultReplies) {
      await executeQuery(
        `INSERT INTO wecom_quick_replies (category, title, trigger_text, reply_content, sort_order, status)
         VALUES (?, ?, ?, ?, ?, 1)`,
        row
      );
    }
  }

  await executeQuery(`
    CREATE TABLE IF NOT EXISTS wecom_match_logs (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      wecom_userid VARCHAR(128) NOT NULL COMMENT '客户企微 external_userid',
      member_no VARCHAR(64) NOT NULL COMMENT '绑定的会员编号',
      matched_member_no VARCHAR(64) NOT NULL COMMENT '今日匹配的目标会员编号',
      match_date DATE NOT NULL COMMENT '匹配日期（YYYY-MM-DD，用于当天唯一校验）',
      notes TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_member_match_date (member_no, match_date),
      KEY idx_wecom_userid_date (wecom_userid, match_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

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
