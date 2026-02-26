const { executeQuery } = require('../src/lib/database-netlify');

// 修复后的合同模板内容
const fixedTemplateContent = `<!DOCTYPE html>
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
            background: white;
            padding: 40px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .contract-header { 
            text-align: center; 
            margin-bottom: 40px; 
            border-bottom: 2px solid #333; 
            padding-bottom: 20px; 
        }
        .contract-content { 
            margin: 30px 0; 
        }
        .signature-section { 
            margin-top: 60px; 
            display: flex; 
            justify-content: space-between; 
        }
        .signature-line { 
            border-bottom: 1px solid #000; 
            width: 200px; 
            display: inline-block; 
            margin-left: 10px; 
            height: 20px;
        }
        .contract-clause { 
            margin: 20px 0; 
        }
        .contract-number { 
            font-weight: bold; 
            color: #666; 
        }
        .field-label {
            font-weight: bold;
            color: #333;
        }
        .field-value {
            border-bottom: 1px solid #000;
            padding: 2px 5px;
            min-width: 150px;
            display: inline-block;
        }
        .party-info { 
            margin: 20px 0; 
            padding: 15px; 
            background-color: #f9f9f9; 
            border-left: 4px solid #007bff; 
        }
        .package-option {
            margin: 10px 0;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        .package-option.selected {
            border-color: #007bff;
            background-color: #f0f8ff;
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
            <div class="party-info">
                <p><span class="field-label">甲方：</span><span class="field-value">{{customerName}}</span></p>
                <p><span class="field-label">乙方：</span><span class="field-value">{{companyName}}</span></p>
            </div>
            
            <div class="contract-clause">
                <h3>第一章：前言</h3>
                <p>1.1 乙方是一家提供形婚信息中介服务的平台，运营有"形婚信息"、"形婚互助圈"等服务平台。</p>
                <p>1.2 甲方有意接受乙方提供的形婚信息中介服务。</p>
                <p>1.3 双方根据《中华人民共和国民法典》等相关法律法规，在平等、自愿、公平、诚实信用的基础上，就服务事宜达成如下协议。</p>
            </div>
            
            <div class="contract-clause">
                <h3>第二章：服务内容与费用</h3>
                <p>甲方选择购买乙方提供的以下第{{selectedPackageNumbers}}项套餐服务（请在方框内打勾）：</p>
                
                <div class="package-option {{packageAClass}}">
                    <p><strong>A.{{packageACheckbox}} 会员套餐-套餐总价：{{packageAPrice}}元（人民币）</strong></p>
                    <p>本套餐包含以下11项服务，服务有效期自本合同生效之日起{{serviceDuration}}：</p>
                    <ul>
                        <li>（1）会员匹配服务：甲方可主动联系乙方平台会员库中的异性会员。原价200元/次。</li>
                        <li>（2）个人信息地区汇总：甲方个人信息将默认加入乙方平台的地区汇总列表。原价150元。</li>
                        <li>（3）专属会员群：邀请甲方加入仅发布异性信息的专属会员群。原价100元。</li>
                        <li>（4）个人信息公众号定期发布：乙方在其微信公众号上定期发布甲方信息。原价50元/次。</li>
                        <li>（5）个人信息朋友圈定期推送：乙方在其官方朋友圈定期推送甲方信息。原价50元/次。</li>
                        <li>（6）个人信息微博定期推送：乙方在其官方微博定期推送甲方信息。原价50元/次。</li>
                        <li>（7）个人信息头条定期推送：乙方在其今日头条账号定期推送甲方信息。原价50元/次。</li>
                        <li>（8）个人信息贴吧定期推送：乙方在相关贴吧定期推送甲方信息。原价50元/次。</li>
                        <li>（9）个人信息微信视频号推送：乙方在其微信视频号定期推送甲方信息。原价50元/次。</li>
                        <li>（10）微信小程序省份置顶（开发中）：小程序上线后，甲方信息将在指定省份定期置顶展示。原价200元。</li>
                        <li>（11）网站省份置顶（开发中）：网站上线后，甲方信息将在指定省份定期置顶展示。原价200元。</li>
                    </ul>
                </div>
                
                <div class="package-option {{packageBClass}}">
                    <p><strong>B.{{packageBCheckbox}} 次卡套餐 -套餐总价：{{packageBPrice}}元（人民币）</strong></p>
                    <p>本套餐包含3次会员匹配服务。甲方可联系平台异性会员，若对方同意，则互推微信并扣除1次次数；若对方不同意，则不扣除次数。重要提示：次卡套餐不包含任何形式的个人信息曝光推送服务（如公众号、朋友圈等）。原价200元/次。</p>
                </div>
                
                <div class="package-option {{packageCClass}}">
                    <p><strong>C.{{packageCCheckbox}} 增值服务1：Banner广告位-服务费用：{{packageCPrice}}元/月</strong></p>
                    <p>甲方个人信息将在乙方微信公众号每日推送、小程序、网站等平台的banner广告位展示。</p>
                </div>
                
                <div class="package-option {{packageDClass}}">
                    <p><strong>D.{{packageDCheckbox}} 增值服务2：一对一红娘匹配服务-服务费用：{{packageDPrice}}元（人民币）</strong></p>
                    <p>乙方根据甲方具体形婚需求，全网查找合适的异性信息，并服务至双方约定的成功标准为止。具体标准需另行签订补充协议约定。</p>
                </div>
            </div>
            
            <div class="contract-clause">
                <h3>第三章：付款方式</h3>
                <p>甲方应于本合同签订之日起{{paymentDays}}日内，向乙方支付上述全部服务费用。</p>
                <p>乙方收款账户信息：{{companyAccountInfo}}</p>
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
                <p>"已享受服务的原价之和"指甲方已使用的各项服务按其单项原价计算的总和。扣除套餐总价的20%作为违约金及服务管理成本。</p>
                <p>次卡及单次服务：次卡套餐次数未使用完毕可按上述第2条规则申请退款。单次联系服务一旦购买，费用不予退还。</p>
                <p>因甲方违规的退款：若甲方违反本合同第四章第2条之规定，乙方有权立即终止服务，已收取的费用不予退还。</p>
            </div>
            
            <div class="contract-clause">
                <h3>第六条：免责声明</h3>
                <p>乙方仅提供信息中介服务，不对甲方与任何第三方会员沟通、交往的结果作任何保证。甲方应自行判断并承担由此产生的一切风险和责任。</p>
            </div>
            
            <div class="contract-clause">
                <h3>第七条：争议解决</h3>
                <p>本合同履行过程中发生的争议，双方应友好协商解决；协商不成的，任何一方均可向乙方所在地人民法院提起诉讼。</p>
            </div>
            
            <div class="contract-clause">
                <h3>第八条：其他约定</h3>
                <p>本合同一式两份，甲乙双方各执一份，具有同等法律效力，自双方签字、盖章之日生效。</p>
                <p>本合同未尽事宜，可由双方另行签订补充协议。</p>
                <p>乙方保留对本合同所涉及服务的最终解释权。</p>
            </div>
        </div>
        
        <div class="signature-section">
            <div>
                <p>甲方（签字）：<span class="signature-line" id="customer-signature"></span></p>
                <p>身份证号：<span class="field-value">{{customerIdCard}}</span></p>
                <p>联系电话：<span class="field-value">{{customerPhone}}</span></p>
            </div>
            <div>
                <p>乙方（盖章）：<span class="signature-line" id="company-signature"></span></p>
            </div>
        </div>
    </div>
</body>
</html>`;

async function updateContractTemplate() {
  try {
    console.log('🔍 检查现有合同模板...');
    
    // 查询现有模板
    const [templates] = await executeQuery('SELECT id, name, type FROM contract_templates ORDER BY id');
    console.log('现有模板:', templates);
    
    // 更新所有MEMBERSHIP类型的模板
    for (const template of templates) {
      if (template.type === 'MEMBERSHIP') {
        console.log(`📝 更新模板 ID: ${template.id}, 名称: ${template.name}`);
        
        await executeQuery(
          'UPDATE contract_templates SET template_content = ?, updated_at = NOW() WHERE id = ?',
          [fixedTemplateContent, template.id]
        );
        
        console.log(`✅ 模板 ${template.id} 更新成功`);
      }
    }
    
    // 如果没有MEMBERSHIP类型的模板，创建一个
    const membershipTemplates = templates.filter(t => t.type === 'MEMBERSHIP');
    if (membershipTemplates.length === 0) {
      console.log('📝 创建新的MEMBERSHIP模板...');
      
      await executeQuery(
        `INSERT INTO contract_templates (name, type, template_content, variables_schema, is_active) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          '石楠文化介绍服务合同',
          'MEMBERSHIP',
          fixedTemplateContent,
          JSON.stringify({
            "contractTitle": "合同标题",
            "contractNumber": "合同编号", 
            "signingDate": "签署日期",
            "companyName": "公司名称",
            "companyTaxId": "公司税号",
            "companyAddress": "公司地址",
            "companyPhone": "公司电话",
            "customerName": "客户姓名",
            "customerIdCard": "客户身份证",
            "customerPhone": "客户电话",
            "customerAddress": "客户地址",
            "serviceType": "服务类型",
            "serviceDuration": "服务期限",
            "serviceFee": "服务费用",
            "customerSignDate": "客户签署日期",
            "companySignDate": "公司签署日期"
          }),
          true
        ]
      );
      
      console.log('✅ 新模板创建成功');
    }
    
    console.log('🎉 所有合同模板更新完成！');
    
  } catch (error) {
    console.error('❌ 更新失败:', error);
  }
}

updateContractTemplate();
