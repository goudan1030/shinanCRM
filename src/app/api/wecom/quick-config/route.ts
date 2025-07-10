import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

/**
 * 快速更新企业微信配置
 * POST /api/wecom/quick-config
 */
export async function POST(request: Request) {
  try {
    const { corp_id, agent_id, secret } = await request.json();
    
    // 使用默认企业ID（需要用户提供正确的）
    const defaultCorpId = corp_id || 'ww8e8ac5c94d7b7ac9'; // 这个需要用户提供真实的企业ID
    
    console.log('快速更新企业微信配置:', {
      corp_id: defaultCorpId,
      agent_id,
      secret: secret ? secret.substring(0, 10) + '...' : '未提供'
    });

    // 使用 REPLACE INTO 确保只有一条记录
    await pool.execute(
      `REPLACE INTO wecom_config (
        id, corp_id, agent_id, secret, 
        member_notification_enabled, notification_recipients, 
        message_type, custom_message_template
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
      [
        defaultCorpId,
        agent_id,
        secret,
        true, // member_notification_enabled
        '@all', // notification_recipients
        'textcard', // message_type
        null // custom_message_template
      ]
    );

    return NextResponse.json({ 
      success: true,
      message: '企业微信配置更新成功',
      config: {
        corp_id: defaultCorpId,
        agent_id: agent_id,
        member_notification_enabled: true,
        notification_recipients: '@all',
        message_type: 'textcard'
      }
    });

  } catch (error) {
    console.error('快速更新企业微信配置失败:', error);
    return NextResponse.json({
      success: false,
      error: '更新配置失败',
      message: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
} 