import { NextRequest, NextResponse } from 'next/server';
import { sendMemberUpdateNotification } from '@/lib/wecom-api';

/**
 * 测试会员资料更新通知功能
 * POST /api/wecom/test-member-update-notification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberData, updatedFields } = body;

    // 如果没有提供测试数据，使用默认数据（基于真实会员M17071的数据）
    const defaultMemberData = {
      id: 1122,
      member_no: 'M17071',
      nickname: '刘鹏',
      phone: '132****4876',
      gender: 'male',
      birth_year: 1993,
      height: 178,
      weight: 80,
      province: '浙江省',
      city: '杭州市',
      district: '萧山区',
      hukou_province: '浙江省',
      hukou_city: '杭州市',
      education: '本科',
      occupation: '新闻媒体',
      house_car: '有房有车',
      children_plan: '一起要',
      marriage_cert: '未婚',
      marriage_history: '无',
      self_description: '黑龙江人 杭州定居工作 事业单位企业聘 稳重靠谱顾家脾气好',
      partner_requirement: '女生身高163cm+ ，事业稳定，杭州工作萧山最好，脾气好、情商高。',
      updated_at: new Date().toISOString()
    };

    const defaultUpdatedFields = ['nickname', 'gender', 'birth_year', 'height', 'weight'];

    const testMemberData = memberData || defaultMemberData;
    const testUpdatedFields = updatedFields || defaultUpdatedFields;

    console.log('🧪 测试会员资料更新通知...');
    console.log('会员数据:', JSON.stringify(testMemberData, null, 2));
    console.log('更新字段:', testUpdatedFields);

    // 发送会员更新通知
    const success = await sendMemberUpdateNotification(testMemberData, testUpdatedFields);

    if (success) {
      console.log('✅ 会员资料更新通知测试成功！');
      return NextResponse.json({
        success: true,
        message: '会员资料更新通知测试成功',
        data: {
          memberData: testMemberData,
          updatedFields: testUpdatedFields,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      console.log('❌ 会员资料更新通知测试失败！');
      return NextResponse.json({
        success: false,
        message: '会员资料更新通知测试失败',
        data: {
          memberData: testMemberData,
          updatedFields: testUpdatedFields,
          timestamp: new Date().toISOString()
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ 测试会员资料更新通知出错:', error);
    return NextResponse.json({
      success: false,
      message: '测试过程中出现错误',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}

/**
 * 获取测试数据
 * GET /api/wecom/test-member-update-notification
 */
export async function GET() {
  const testData = {
    memberData: {
      id: 1122,
      member_no: 'M17071',
      nickname: '刘鹏',
      phone: '132****4876',
      gender: 'male',
      birth_year: 1993,
      height: 178,
      weight: 80,
      province: '浙江省',
      city: '杭州市',
      district: '萧山区',
      hukou_province: '浙江省',
      hukou_city: '杭州市',
      education: '本科',
      occupation: '新闻媒体',
      house_car: '有房有车',
      children_plan: '一起要',
      marriage_cert: '未婚',
      marriage_history: '无',
      self_description: '黑龙江人 杭州定居工作 事业单位企业聘 稳重靠谱顾家脾气好',
      partner_requirement: '女生身高163cm+ ，事业稳定，杭州工作萧山最好，脾气好、情商高。',
      updated_at: new Date().toISOString()
    },
    updatedFields: ['nickname', 'gender', 'birth_year', 'height', 'weight']
  };

  return NextResponse.json({
    success: true,
    message: '测试数据',
    data: testData
  });
}
