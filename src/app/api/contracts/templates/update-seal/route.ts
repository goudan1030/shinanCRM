import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';

// 更新合同模板 - 修复盖章位置和移除不需要的甲方信息
export async function POST() {
  try {
    console.log('🔧 开始更新合同模板...');

    // 会员服务合同模板
    const membershipTemplate = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{{contractTitle}}</title>
    <style>
        body { font-family: "Microsoft YaHei", Arial, sans-serif; line-height: 1.6; margin: 40px; }
        .contract-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .contract-content { margin: 30px 0; }
        .signature-section { margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-start; }
        .signature-line { border-bottom: 1px solid #000; width: 200px; display: inline-block; margin: 10px 0; }
        .contract-clause { margin: 15px 0; }
        .contract-number { font-weight: bold; color: #666; }
        .party-info { margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #007bff; }
        .seal-container { text-align: center; flex: 1; }
        .company-seal { width: 120px; height: 120px; margin: 10px auto; display: block; }
        .signature-area { text-align: center; flex: 1; }
    </style>
</head>
<body>
    <div class="contract-header">
        <h1>{{contractTitle}}</h1>
        <p class="contract-number">合同编号：{{contractNumber}}</p>
        <p>签署日期：{{signDate}}</p>
    </div>
    
    <div class="contract-content">
        <div class="party-info">
            <h3>甲方（服务提供方）：</h3>
            <p><strong>公司名称：</strong>{{companyName}}</p>
            <p><strong>统一社会信用代码：</strong>{{companyTaxId}}</p>
            <p><strong>注册地址：</strong>{{companyAddress}}</p>
        </div>
        
        <div class="party-info">
            <h3>乙方（客户）：</h3>
            <p><strong>姓名：</strong>{{customerName}}</p>
            <p><strong>身份证号：</strong>{{customerIdCard}}</p>
            <p><strong>联系电话：</strong>{{customerPhone}}</p>
            <p><strong>联系地址：</strong>{{customerAddress}}</p>
        </div>
        
        <div class="contract-clause">
            <h3>第一条 服务内容</h3>
            <p>甲方为乙方提供{{serviceType}}，具体包括：</p>
            <ul>
                <li>专业咨询服务</li>
                <li>个性化匹配服务</li>
                <li>一对一指导服务</li>
                <li>后续跟踪服务</li>
            </ul>
        </div>
        
        <div class="contract-clause">
            <h3>第二条 服务期限</h3>
            <p>服务期限为{{serviceDuration}}，自合同签署之日起计算。</p>
        </div>
        
        <div class="contract-clause">
            <h3>第三条 服务费用</h3>
            <p>服务费用为人民币{{serviceFee}}元，乙方应在合同签署时一次性支付。</p>
        </div>
        
        <div class="contract-clause">
            <h3>第四条 双方权利义务</h3>
            <p><strong>甲方权利义务：</strong></p>
            <ul>
                <li>按照约定提供专业服务</li>
                <li>保护乙方个人信息安全</li>
                <li>及时响应乙方合理需求</li>
            </ul>
            <p><strong>乙方权利义务：</strong></p>
            <ul>
                <li>按时支付服务费用</li>
                <li>提供真实有效的个人信息</li>
                <li>配合甲方完成相关服务</li>
            </ul>
        </div>
        
        <div class="contract-clause">
            <h3>第五条 违约责任</h3>
            <p>任何一方违反本合同约定，应承担相应的违约责任，并赔偿对方因此遭受的损失。</p>
        </div>
        
        <div class="contract-clause">
            <h3>第六条 争议解决</h3>
            <p>因履行本合同发生的争议，双方应友好协商解决；协商不成的，可向甲方所在地人民法院提起诉讼。</p>
        </div>
        
        <div class="contract-clause">
            <h3>第七条 其他条款</h3>
            <p>1. 本合同自双方签署之日起生效；</p>
            <p>2. 本合同未尽事宜，双方可另行协商补充；</p>
            <p>3. 本合同一式两份，甲乙双方各执一份，具有同等法律效力。</p>
        </div>
    </div>
    
    <div class="signature-section">
        <div class="seal-container">
            <p><strong>甲方（盖章）：</strong></p>
            <img src="/zhang.png" alt="公司印章" class="company-seal">
            <p>日期：{{contractGenerateDate}}</p>
        </div>
        <div class="signature-area">
            <p><strong>乙方（签名）：</strong></p>
            <div class="signature-line"></div>
            <p>日期：_____________</p>
        </div>
    </div>
</body>
</html>`;

    // 一次性服务合同模板
    const oneTimeTemplate = membershipTemplate.replace(
      '<li>后续跟踪服务</li>',
      '<li>后续跟踪服务</li>'
    );

    // 更新会员服务合同模板
    await executeQuery(
      'UPDATE contract_templates SET template_content = ? WHERE type = ?',
      [membershipTemplate, 'MEMBERSHIP']
    );
    console.log('✅ 更新会员服务合同模板完成');

    // 更新一次性服务合同模板
    await executeQuery(
      'UPDATE contract_templates SET template_content = ? WHERE type = ?',
      [oneTimeTemplate, 'ONE_TIME']
    );
    console.log('✅ 更新一次性服务合同模板完成');

    // 更新年费服务合同模板（如果存在）
    const annualTemplate = membershipTemplate.replace(
      '<li>后续跟踪服务</li>',
      '<li>后续跟踪服务</li>\n                <li>年度专属服务</li>'
    );
    
    await executeQuery(
      'UPDATE contract_templates SET template_content = ? WHERE type = ?',
      [annualTemplate, 'ANNUAL']
    );
    console.log('✅ 更新年费服务合同模板完成');

    return NextResponse.json({
      success: true,
      message: '合同模板更新成功',
      updates: [
        '✅ 移除了甲方联系电话和法定代表人信息',
        '✅ 修复了公司盖章位置，现在在底部甲方签署区域',
        '✅ 更新了所有合同类型的模板'
      ]
    });

  } catch (error) {
    console.error('更新合同模板失败:', error);
    return NextResponse.json(
      { error: '更新合同模板失败', details: error },
      { status: 500 }
    );
  }
}
