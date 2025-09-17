import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';

// 重新生成合同内容 - 紧急修复API
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contractId = parseInt(id);

    if (isNaN(contractId)) {
      return NextResponse.json(
        { error: '无效的合同ID' },
        { status: 400 }
      );
    }

    // 获取合同和相关信息
    const [contractRows] = await executeQuery(
      `SELECT 
        c.*,
        m.member_no,
        m.nickname,
        m.real_name,
        m.phone,
        m.id_card,
        ct.name as template_name,
        ct.template_content
      FROM contracts c
      LEFT JOIN members m ON c.member_id = m.id
      LEFT JOIN contract_templates ct ON c.template_id = ct.id
      WHERE c.id = ?`,
      [contractId]
    );

    if (!contractRows || (contractRows as any[]).length === 0) {
      return NextResponse.json(
        { error: '合同不存在' },
        { status: 404 }
      );
    }

    const contract = (contractRows as any[])[0];
    const member = {
      real_name: contract.real_name,
      nickname: contract.nickname,
      phone: contract.phone,
      id_card: contract.id_card
    };

    console.log('🔍 重新生成合同，会员信息:', member);

    // 重新准备合同变量
    const contractVariables = {
      // 合同基本信息
      contractTitle: contract.template_name || '服务合同',
      contractNumber: contract.contract_number,
      signDate: contract.signed_at ? new Date(contract.signed_at).toLocaleDateString('zh-CN') : '', // 只有已签署才显示日期
      contractGenerateDate: new Date().toLocaleDateString('zh-CN'),
      
      // 甲方信息（公司信息）
      companyName: '杭州石楠文化科技有限公司',
      companyTaxId: '91330105MA2KCLP6X2',
      companyAddress: '浙江省杭州市拱墅区',
      
      // 乙方信息（客户信息）
      customerName: member.real_name || member.nickname || '待客户填写',
      customerIdCard: member.id_card || '待客户填写',
      customerPhone: member.phone || '待客户填写',
      customerAddress: '待客户填写',
      
      // 服务信息
      serviceType: contract.contract_type === 'MEMBERSHIP' ? '会员服务' : 
                   contract.contract_type === 'ONE_TIME' ? '一次性服务' : '年费服务',
      serviceDuration: contract.contract_type === 'MEMBERSHIP' ? '1年' : 
                      contract.contract_type === 'ONE_TIME' ? '3个月' : '1年',
      serviceFee: contract.contract_type === 'MEMBERSHIP' ? '299' : 
                  contract.contract_type === 'ONE_TIME' ? '99' : '999'
    };

    console.log('📋 合同变量:', contractVariables);

    // 重新渲染合同内容
    let newContent = contract.template_content;
    
    // 替换所有变量
    Object.entries(contractVariables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      const valueStr = String(value || '');
      
      if (newContent.includes(placeholder)) {
        console.log(`✅ 替换 ${placeholder} -> "${valueStr}"`);
        newContent = newContent.split(placeholder).join(valueStr);
      }
    });

    // 更新数据库中的合同内容和变量
    await executeQuery(
      'UPDATE contracts SET content = ?, variables = ?, updated_at = NOW() WHERE id = ?',
      [newContent, JSON.stringify(contractVariables), contractId]
    );

    console.log('✅ 合同内容已重新生成');

    return NextResponse.json({ 
      success: true, 
      message: '合同内容已重新生成',
      contractVariables 
    });

  } catch (error) {
    console.error('重新生成合同失败:', error);
    return NextResponse.json(
      { error: '重新生成合同失败' },
      { status: 500 }
    );
  }
}
