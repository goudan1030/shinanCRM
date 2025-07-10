import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

// 获取企业微信配置
export async function GET() {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM wecom_config LIMIT 1'
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

    if (!corp_id || !agent_id || !secret) {
      return NextResponse.json(
        { error: '请提供完整的基础配置信息（企业ID、应用ID、应用Secret）' },
        { status: 400 }
      );
    }

    // 使用 REPLACE INTO 确保只有一条记录，包含新的通知配置字段
    await pool.execute(
      `REPLACE INTO wecom_config (
        id, corp_id, agent_id, secret, 
        member_notification_enabled, notification_recipients, 
        message_type, custom_message_template
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
      [
        corp_id, 
        agent_id, 
        secret, 
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