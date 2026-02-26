import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';

/**
 * 更新企业微信完整配置
 * POST /api/wecom/update-config
 */
export async function POST(request: Request) {
  try {
    const { corp_id } = await request.json();
    
    if (!corp_id) {
      return NextResponse.json({
        success: false,
        error: '请提供企业ID (corp_id)'
      }, { status: 400 });
    }

    console.log('更新企业微信完整配置:', {
      corp_id,
      agent_id: '1000011',
      secret: 'e2qf4MOg62XHL2QkTZg5cyUkHb8X0JW0G7vvHxXbazA',
      token: 'L411dhQg'
    });

    // 使用 REPLACE INTO 确保只有一条记录
    await executeQuery(
      `REPLACE INTO wecom_config (
        id, corp_id, agent_id, secret, token,
        member_notification_enabled, notification_recipients, 
        message_type, custom_message_template,
        created_at, updated_at
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        corp_id,
        '1000011', // agent_id
        'e2qf4MOg62XHL2QkTZg5cyUkHb8X0JW0G7vvHxXbazA', // secret
        'L411dhQg', // token
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
        corp_id: corp_id,
        agent_id: '1000011',
        secret: 'e2qf4MOg62XHL2QkTZg5cyUkHb8X0JW0G7vvHxXbazA',
        token: 'L411dhQg',
        member_notification_enabled: true,
        notification_recipients: '@all',
        message_type: 'textcard',
        server_ip: '149.112.117.21'
      }
    });

  } catch (error) {
    console.error('更新企业微信配置失败:', error);
    return NextResponse.json({
      success: false,
      error: '更新配置失败',
      message: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}

/**
 * 获取当前配置状态
 * GET /api/wecom/update-config
 */
export async function GET() {
  try {
    const [rows] = await executeQuery(
      'SELECT * FROM wecom_config LIMIT 1'
    );

    const config = (rows as any[])[0];

    return NextResponse.json({
      success: true,
      hasConfig: !!config,
      currentConfig: config ? {
        corp_id: config.corp_id,
        agent_id: config.agent_id,
        hasSecret: !!config.secret,
        hasToken: !!config.token,
        member_notification_enabled: config.member_notification_enabled,
        created_at: config.created_at,
        updated_at: config.updated_at
      } : null,
      requiredFields: {
        corp_id: '企业ID - 需要您提供',
        agent_id: '1000011 - 已配置',
        secret: 'e2qf4MOg62XHL2QkTZg5cyUkHb8X0JW0G7vvHxXbazA - 已配置',
        token: 'L411dhQg - 已配置'
      },
      nextSteps: [
        '1. 从企业微信管理后台获取企业ID',
        '2. 调用POST接口更新配置',
        '3. 在企业微信后台配置接收消息URL',
        '4. 添加服务器IP到白名单: 149.112.117.21',
        '5. 测试消息接收功能'
      ]
    });

  } catch (error) {
    console.error('获取配置状态失败:', error);
    return NextResponse.json({
      success: false,
      error: '获取配置失败',
      message: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
} 