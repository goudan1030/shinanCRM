import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';

// 更新印章样式为叠加效果
function updateSealOverlayStyle(content: string): string {
  // 更新CSS样式
  const oldSealStyle = `.seal-container { text-align: center; flex: 1; }
        .company-seal { width: 120px; height: 120px; margin: 10px auto; display: block; }`;
  
  const newSealStyle = `.seal-container { 
            text-align: left; 
            flex: 1; 
            position: relative;
            line-height: 1.8;
        }
        .company-seal { 
            position: absolute;
            width: 100px; 
            height: 100px; 
            top: -10px;
            right: 20px;
            z-index: 2;
            opacity: 0.9;
        }`;

  // 替换CSS样式
  content = content.replace(oldSealStyle, newSealStyle);

  // 更新HTML结构，在甲方信息中添加公司名称
  const oldSealHTML = `<div class="seal-container">
            <p><strong>甲方（盖章）：</strong></p>
            <img src="/zhang.png" alt="公司印章" class="company-seal">
            <p>日期：`;
  
  const newSealHTML = `<div class="seal-container">
            <p><strong>甲方（盖章）：</strong></p>
            <p>杭州石楠文化科技有限公司</p>
            <img src="/zhang.png" alt="公司印章" class="company-seal">
            <p>日期：`;

  content = content.replace(oldSealHTML, newSealHTML);

  return content;
}

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

    // 解析合同变量
    const existingVariables = contract.variables ? (typeof contract.variables === 'string' ? JSON.parse(contract.variables) : contract.variables) : {};
    
    // 解析选中的套餐
    const selectedPackages = existingVariables.selected_packages ? 
      (typeof existingVariables.selected_packages === 'string' ? JSON.parse(existingVariables.selected_packages) : existingVariables.selected_packages) : [];
    
    console.log('📦 重新生成 - 选中的套餐:', selectedPackages);
    
    // 生成选中的套餐字母
    const selectedPackageLetters = selectedPackages.map((pkg: any) => pkg.letter).join('、');
    
    // 重新准备合同变量 - 使用新的模板结构
    const contractVariables = {
      // 合同基本信息
      contractTitle: contract.template_name || '石楠文化介绍服务合同',
      contractNumber: contract.contract_number,
      signingDate: contract.signed_at ? new Date(contract.signed_at).toLocaleDateString('zh-CN') : new Date().toLocaleDateString('zh-CN'),
      
      // 甲方信息（客户信息）
      customerName: (member.real_name && member.real_name !== member.nickname) ? member.real_name : '待客户填写',
      customerIdCard: member.id_card || '待客户填写',
      customerPhone: member.phone || '待客户填写',
      customerAddress: '待客户填写',
      
      // 乙方信息（公司信息）
      companyName: '杭州石楠文化科技有限公司',
      companyTaxId: '91330105MA2KCLP6X2',
      companyAddress: '浙江省杭州市西湖区文三路259号',
      companyPhone: '0571-88888888',
      
      // 服务信息（仅用于记录，不用于模板替换）
      serviceType: '石楠文化介绍服务',
      serviceEndDate: existingVariables.service_end_date || '',
      originalAmount: existingVariables.original_amount || '0',
      contractAmount: existingVariables.contract_amount || '0',
      
      // 套餐信息
      selectedPackages: selectedPackages,
      selectedPackageNumbers: existingVariables.selected_package_numbers || 'A',
      selectedPackageLetters: selectedPackageLetters || 'A',
      
      // 套餐选择状态（仅用于记录，不用于模板替换）
      packageAClass: selectedPackages.some((pkg: any) => pkg.id === 'A') ? 'selected' : '',
      packageBClass: selectedPackages.some((pkg: any) => pkg.id === 'B') ? 'selected' : '',
      packageCClass: selectedPackages.some((pkg: any) => pkg.id === 'C') ? 'selected' : '',
      packageDClass: selectedPackages.some((pkg: any) => pkg.id === 'D') ? 'selected' : '',
      
      
      // 保留现有变量
      ...existingVariables
    };

    console.log('📋 合同变量:', contractVariables);

    // 使用固定的PDF格式模板
    let newContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{{contractTitle}}</title>
    <style>
        body { 
            font-family: "Microsoft YaHei", Arial, sans-serif; 
            line-height: 1.8; 
            margin: 40px; 
            color: #333;
            font-size: 14px;
            background: white;
        }
        .contract-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
        }
        .contract-header { 
            text-align: center; 
            margin-bottom: 40px; 
        }
        .contract-content { 
            margin: 30px 0; 
        }
        .signature-section { 
            margin-top: 60px; 
        }
        .contract-clause { 
            margin: 30px 0; 
        }
        .contract-number { 
            font-weight: bold; 
        }
        .field-label {
            font-weight: bold;
            color: #333;
        }
        .field-value {
            display: inline-block;
        }
        .party-info { 
            margin: 20px 0; 
        }
        .package-option {
            margin: 20px 0;
        }
        .service-list {
            margin: 15px 0;
        }
        .service-item {
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="contract-container">
        <div class="contract-header">
            <h1>{{contractTitle}}</h1>
            <p class="contract-number">合同编号：<span class="field-value">{{contractNumber}}</span></p>
            <p>签订日期：<span class="field-value">{{signingDate}}</span></p>
        </div>
        
        <div class="contract-content">
            <p>甲方：{{customerName}}</p>
            <p>乙方：{{companyName}}</p>
            <p>签订日期：{{signingDate}}</p>
            
            <div class="contract-clause">
                <h3>第一章：前言</h3>
                <p>1.1 乙方是一家提供形婚信息中介服务的平台，运营有"形婚信息"、"形婚互助圈"等服务平台。</p>
                <p>1.2 甲方有意接受乙方提供的形婚信息中介服务。</p>
                <p>1.3 双方根据《中华人民共和国民法典》等相关法律法规，在平等、自愿、公平、诚实信用的基础上，就服务事宜达成如下协议。</p>
            </div>
            
            <div class="contract-clause">
                <h3>第二章：服务内容与费用</h3>
                <p>甲方选择购买乙方提供的以下第 <u>{{selectedPackageLetters}}</u> 项套餐服务：</p>
                
                <div class="package-option">
                    <p><strong>A.☐ 会员套餐-套餐总价：1299元（人民币）</strong></p>
                    <p>本套餐包含以下11项服务，服务有效期自本合同生效之日起12个月：</p>
                    <div class="service-list">
                        <div class="service-item">（1）会员匹配服务：甲方可主动联系乙方平台会员库中的异性会员。原价200元/次。</div>
                        <div class="service-item">（2）个人信息地区汇总：甲方个人信息将默认加入乙方平台的地区汇总列表。原价150元。</div>
                        <div class="service-item">（3）专属会员群：邀请甲方加入仅发布异性信息的专属会员群。原价100元。</div>
                        <div class="service-item">（4）个人信息公众号定期发布：乙方在其微信公众号上定期发布甲方信息。原价50元/次。</div>
                        <div class="service-item">（5）个人信息朋友圈定期推送：乙方在其官方朋友圈定期推送甲方信息。原价50元/次。</div>
                        <div class="service-item">（6）个人信息微博定期推送：乙方在其官方微博定期推送甲方信息。原价50元/次。</div>
                        <div class="service-item">（7）个人信息头条定期推送：乙方在其今日头条账号定期推送甲方信息。原价50元/次。</div>
                        <div class="service-item">（8）个人信息贴吧定期推送：乙方在相关贴吧定期推送甲方信息。原价50元/次。</div>
                        <div class="service-item">（9）个人信息微信视频号推送：乙方在其微信视频号定期推送甲方信息。原价50元/次。</div>
                        <div class="service-item">（10）微信小程序省份置顶（开发中）：小程序上线后，甲方信息将在指定省份定期置顶展示。原价200元。</div>
                        <div class="service-item">（11）网站省份置顶（开发中）：网站上线后，甲方信息将在指定省份定期置顶展示。原价200元。</div>
                    </div>
                </div>
                
                <div class="package-option">
                    <p><strong>B.☐ 次卡套餐 -套餐总价：489元（人民币）</strong></p>
                    <p>本套餐包含3次会员匹配服务。甲方可联系平台异性会员，若对方同意，则互推微信并扣除1次次数；若对方不同意，则不扣除次数。重要提示：次卡套餐不包含任何形式的个人信息曝光推送服务（如公众号、朋友圈等）。原价200元/次。</p>
                </div>
                
                <div class="package-option">
                    <p><strong>C.☐ 增值服务1：Banner广告位-服务费用：300元/月</strong></p>
                    <p>甲方个人信息将在乙方微信公众号每日推送、小程序、网站等平台的banner广告位展示。</p>
                </div>
                
                <div class="package-option">
                    <p><strong>D.☐ 增值服务2：一对一红娘匹配服务-服务费用：16888元（人民币）</strong></p>
                    <p>乙方根据甲方具体形婚需求，全网查找合适的异性信息，并服务至双方约定的成功标准为止。具体标准需另行签订补充协议约定。</p>
                </div>
            </div>
            
            <div class="contract-clause">
                <h3>第三章：付款方式</h3>
                <p>甲方应于本合同签订之日起1日内，向乙方支付上述全部服务费用。</p>
                <p>乙方收款账户信息：</p>
                <p><img src="/alipay.png" alt="支付宝收款二维码" style="max-width: 200px; height: auto;"></p>
            </div>
            
            <div class="contract-clause">
                <h3>第四章：双方权利与义务</h3>
                <p>1.甲方应提供真实、准确、完整的个人资料。</p>
                <p>2.甲方不得将乙方提供的任何会员信息私自分享、泄露给第三方，一经发现，乙方有权立即终止服务且不予退款，并保留追究法律责任的权利。</p>
                <p>3.甲方应遵守乙方平台的各项规则。</p>
                <p>4.乙方应按照本合同约定的服务内容和标准向甲方提供服务。</p>
                <p>5.乙方对甲方的个人信息负有保密义务，但法律法规另有规定或为提供服务所必需的除外。</p>
                <p>6.乙方服务时间为工作日8:30-19:30，周末及节假日休息。</p>
            </div>
            
            <div class="contract-clause">
                <h3>第五章：退款说明（重要条款）</h3>
                <p>甲方在此充分知悉并同意以下退款规则：</p>
                <p>1.无特殊原因，不退款原则：鉴于本服务的特殊性与即时性（信息一经发布或匹配服务一经启动即无法收回），甲方付款后，如无特殊原因，乙方概不退还任何费用。</p>
                <p>2.特殊原因退款规则：如因不可抗力或乙方原因导致服务无法继续，甲方申请退款，需向乙方提出书面申请。退款金额计算方式为：套餐总价-(已享受服务的原价之和)-(套餐总价 × 20%)=可退金额。</p>
                <p>"已享受服务的原价之和"指甲方已使用的各项服务按其单项原价计算的总和。</p>
                <p>扣除套餐总价的20%作为违约金及服务管理成本。</p>
                <p>次卡及单次服务：次卡套餐次数未使用完毕可按上述第2条规则申请退款。单次联系服务一旦购买，费用不予退还。</p>
                <p>因甲方违规的退款若甲方违反本合同第四章第2条之规定，乙方有权立即终止服务，已收取的费用不予退还。</p>
            </div>
            
            <div class="contract-clause">
                <h3>第六条 免责声明</h3>
                <p>乙方仅提供信息中介服务，不对甲方与任何第三方会员沟通、交往的结果作任何保证。甲方应自行判断并承担由此产生的一切风险和责任。</p>
            </div>
            
            <div class="contract-clause">
                <h3>第七条 争议解决</h3>
                <p>本合同履行过程中发生的争议，双方应友好协商解决；协商不成的，任何一方均可向乙方所在地人民法院提起诉讼。</p>
            </div>
            
            <div class="contract-clause">
                <h3>第八条 其他约定</h3>
                <p>本合同一式两份，甲乙双方各执一份，具有同等法律效力，自双方签字、盖章之日生效。</p>
                <p>本合同未尽事宜，可由双方另行签订补充协议。</p>
                <p>乙方保留对本合同所涉及服务的最终解释权。</p>
            </div>
            
            <div class="signature-section" style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 60px;">
                <div style="text-align: left; flex: 1;">
                    <p><strong>甲方（签字）：</strong></p>
                    <p>身份证号：待客户填写</p>
                    <p>联系电话：待客户填写</p>
                </div>
                <div style="text-align: right; flex: 1; position: relative;">
                    <p><strong>乙方（盖章）：</strong></p>
                    <p>杭州石楠文化科技有限公司</p>
                    <img src="/zhang.png" alt="公司印章" style="position: absolute; width: 100px; height: 100px; top: -10px; right: 20px; z-index: 2; opacity: 0.9; transform: rotate(-15deg);">
                    <p>盖章日期：{{signingDate}}</p>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
    
    console.log('🔄 使用固定PDF模板');
    
    // 替换所有变量
    Object.entries(contractVariables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      const valueStr = String(value || '');
      
      if (newContent.includes(placeholder)) {
        console.log(`✅ 替换 ${placeholder} -> "${valueStr}"`);
        newContent = newContent.split(placeholder).join(valueStr);
      }
    });

    // 更新印章样式为叠加效果
    newContent = updateSealOverlayStyle(newContent);

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
