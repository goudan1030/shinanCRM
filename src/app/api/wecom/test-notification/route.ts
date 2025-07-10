import { NextResponse } from 'next/server';
import { sendMemberRegistrationNotification, getWecomConfig, getWecomAccessToken, sendWecomMessageDetailed, formatMemberNotificationCard, formatMemberNotificationText, formatMemberNotificationMarkdown } from '@/lib/wecom-api';

/**
 * 测试企业微信会员登记通知功能
 * POST /api/wecom/test-notification
 */
export async function POST(request: Request) {
  try {
    console.log('开始测试企业微信通知功能...');
    
    // 模拟会员数据
    const testMemberData = {
      id: 999999,
      member_no: 'TEST001',
      nickname: '测试用户',
      wechat: 'test_wechat',
      phone: '13800138000',
      gender: 'male',
      birth_year: 1990,
      height: 175,
      weight: 70,
      province: '北京市',
      city: '北京市',
      district: '朝阳区',
      type: 'NORMAL',
      created_at: new Date().toISOString()
    };

    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      testData: testMemberData,
      steps: []
    };

    // 详细步骤调试
    debugInfo.steps.push({ step: '1. 获取企业微信配置', status: 'checking' });
    const config = await getWecomConfig();
    if (!config) {
      debugInfo.steps[0].status = 'error';
      debugInfo.steps[0].error = '企业微信配置不存在';
      return NextResponse.json({
        success: false,
        message: '企业微信配置不存在',
        debug: debugInfo
      }, { status: 400 });
    }
    debugInfo.steps[0].status = 'success';
    debugInfo.steps[0].data = {
      corp_id_exists: !!config.corp_id,
      agent_id: config.agent_id,
      notification_enabled: config.member_notification_enabled,
      recipients: config.notification_recipients,
      message_type: config.message_type
    };

    debugInfo.steps.push({ step: '2. 获取Access Token', status: 'checking' });
    const accessToken = await getWecomAccessToken(config);
    if (!accessToken) {
      debugInfo.steps[1].status = 'error';
      debugInfo.steps[1].error = '无法获取Access Token';
      return NextResponse.json({
        success: false,
        message: '无法获取Access Token',
        debug: debugInfo
      }, { status: 400 });
    }
    debugInfo.steps[1].status = 'success';
    debugInfo.steps[1].data = {
      token_length: accessToken.length,
      token_prefix: accessToken.substring(0, 10) + '...'
    };

    debugInfo.steps.push({ step: '3. 准备消息内容', status: 'checking' });
    const messageType = config.message_type || 'textcard';
    const recipients = config.notification_recipients || '@all';
    
    const message: any = {
      touser: recipients,
      msgtype: messageType,
      agentid: config.agent_id
    };
    
    // 根据消息类型设置消息内容
    switch (messageType) {
      case 'textcard':
        message.textcard = formatMemberNotificationCard(testMemberData);
        break;
      case 'text':
        message.text = {
          content: formatMemberNotificationText(testMemberData)
        };
        break;
      case 'markdown':
        message.markdown = {
          content: formatMemberNotificationMarkdown(testMemberData)
        };
        break;
      default:
        message.textcard = formatMemberNotificationCard(testMemberData);
    }
    
    debugInfo.steps[2].status = 'success';
    debugInfo.steps[2].data = {
      message_type: messageType,
      recipients: recipients,
      agent_id: config.agent_id,
      message_content: message
    };

    debugInfo.steps.push({ step: '4. 发送企业微信消息', status: 'checking' });
    try {
      const sendResult = await sendWecomMessageDetailed(accessToken, message);
      
      if (sendResult.success) {
        debugInfo.steps[3].status = 'success';
        debugInfo.steps[3].message = '消息发送成功';
        debugInfo.steps[3].data = sendResult.data;
        
        return NextResponse.json({
          success: true,
          message: '测试通知发送成功！请检查企业微信应用是否收到消息。',
          debug: debugInfo
        });
      } else {
        debugInfo.steps[3].status = 'error';
        debugInfo.steps[3].error = sendResult.error || '消息发送失败';
        debugInfo.steps[3].errorCode = sendResult.errorCode;
        debugInfo.steps[3].data = sendResult.data;
        
        return NextResponse.json({
          success: false,
          message: `消息发送失败: ${sendResult.error}`,
          debug: debugInfo
        }, { status: 400 });
      }
    } catch (sendError) {
      debugInfo.steps[3].status = 'error';
      debugInfo.steps[3].error = sendError instanceof Error ? sendError.message : '发送过程中出现异常';
      
      return NextResponse.json({
        success: false,
        message: '发送过程中出现异常',
        error: sendError instanceof Error ? sendError.message : '未知错误',
        debug: debugInfo
      }, { status: 500 });
    }

  } catch (error) {
    console.error('测试企业微信通知失败:', error);
    
    return NextResponse.json({
      success: false,
      message: '测试过程中发生错误',
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 