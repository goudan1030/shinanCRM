import { NextResponse } from 'next/server';
import { sendMemberRegistrationNotification } from '@/lib/wecom-api';

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

    // 尝试发送通知
    const success = await sendMemberRegistrationNotification(testMemberData);

    if (success) {
      return NextResponse.json({
        success: true,
        message: '测试通知发送成功！请检查企业微信应用是否收到消息。',
        data: {
          testData: testMemberData,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: '测试通知发送失败，请检查企业微信配置是否正确。',
        data: {
          testData: testMemberData,
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
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