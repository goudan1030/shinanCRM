import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';

// 获取企业微信配置
export async function GET() {
  try {
    const [rows] = await executeQuery(
      `SELECT 
        corp_id,
        agent_id,
        member_notification_enabled,
        notification_recipients,
        message_type,
        custom_message_template,
        CASE WHEN secret IS NOT NULL AND secret <> '' THEN 1 ELSE 0 END AS has_secret
      FROM wecom_config
      LIMIT 1`
    );

    return NextResponse.json(rows[0] || {});
  } catch (error) {
    console.error('获取企业微信配置失败:', error);
    return NextResponse.json(
      { error: '获取企业微信配置失败' },
      { status: 500 }
    );
  }
}

// 更新企业微信配置
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { 
      corp_id, 
      agent_id, 
      secret,
      member_notification_enabled = true,
      notification_recipients = '@all',
      message_type = 'textcard',
      custom_message_template = null
    } = data;

    if (!corp_id || !agent_id) {
      return NextResponse.json(
        { error: '请提供完整的基础配置信息（企业ID、应用ID）' },
        { status: 400 }
      );
    }

    const normalizedSecret = typeof secret === 'string' && secret.trim() ? secret.trim() : null;

    // upsert配置；当secret为空时保留数据库中已有secret
    await executeQuery(
      `INSERT INTO wecom_config (
        id, corp_id, agent_id, secret, 
        member_notification_enabled, notification_recipients, 
        message_type, custom_message_template
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        corp_id = VALUES(corp_id),
        agent_id = VALUES(agent_id),
        secret = IFNULL(VALUES(secret), secret),
        member_notification_enabled = VALUES(member_notification_enabled),
        notification_recipients = VALUES(notification_recipients),
        message_type = VALUES(message_type),
        custom_message_template = VALUES(custom_message_template)`,
      [
        corp_id, 
        agent_id, 
        normalizedSecret, 
        member_notification_enabled,
        notification_recipients,
        message_type,
        custom_message_template
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新企业微信配置失败:', error);
    return NextResponse.json(
      { error: '更新企业微信配置失败' },
      { status: 500 }
    );
  }
}