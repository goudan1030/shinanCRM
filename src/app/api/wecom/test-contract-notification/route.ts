import { NextRequest, NextResponse } from 'next/server';
import { sendContractSignNotification } from '@/lib/wecom-api';

/**
 * 测试合同签署通知功能
 * POST /api/wecom/test-contract-notification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractData, signerInfo } = body;

    // 如果没有提供测试数据，使用默认数据
    const defaultContractData = {
      id: 1,
      contract_number: 'TEST-2025-001',
      contract_type: 'MEMBERSHIP',
      signed_at: new Date().toISOString(),
      member_no: 'M17071',
      member_name: '测试会员'
    };

    const defaultSignerInfo = {
      realName: '张三',
      idCard: '110101199001011234',
      phone: '13800138000'
    };

    const testContractData = contractData || defaultContractData;
    const testSignerInfo = signerInfo || defaultSignerInfo;

    console.log('开始测试合同签署通知...');
    console.log('合同数据:', testContractData);
    console.log('签署人信息:', testSignerInfo);

    // 发送企业微信通知
    const success = await sendContractSignNotification(testContractData, testSignerInfo);

    if (success) {
      console.log('✅ 合同签署通知测试成功');
      return NextResponse.json({
        success: true,
        message: '合同签署通知测试成功',
        data: {
          contractData: testContractData,
          signerInfo: testSignerInfo,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      console.log('❌ 合同签署通知测试失败');
      return NextResponse.json({
        success: false,
        message: '合同签署通知测试失败',
        data: {
          contractData: testContractData,
          signerInfo: testSignerInfo,
          timestamp: new Date().toISOString()
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('测试合同签署通知出错:', error);
    return NextResponse.json({
      success: false,
      error: '测试合同签署通知出错',
      message: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}

/**
 * 获取测试合同签署通知的帮助信息
 * GET /api/wecom/test-contract-notification
 */
export async function GET() {
  return NextResponse.json({
    message: '合同签署通知测试接口',
    usage: {
      method: 'POST',
      url: '/api/wecom/test-contract-notification',
      body: {
        contractData: {
          id: 'number (可选)',
          contract_number: 'string (可选)',
          contract_type: 'string (可选)',
          signed_at: 'string (可选)',
          member_no: 'string (可选)',
          member_name: 'string (可选)'
        },
        signerInfo: {
          realName: 'string (可选)',
          idCard: 'string (可选)',
          phone: 'string (可选)'
        }
      }
    },
    examples: {
      '使用默认数据': 'POST /api/wecom/test-contract-notification',
      '使用自定义数据': 'POST /api/wecom/test-contract-notification\n{\n  "contractData": {\n    "contract_number": "CUSTOM-001",\n    "member_name": "自定义会员"\n  },\n  "signerInfo": {\n    "realName": "李四",\n    "phone": "13900139000"\n  }\n}'
    }
  });
}
