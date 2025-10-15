#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function updateContractTemplateFromActualPDF() {
  let connection;
  
  try {
    console.log('🚀 基于实际PDF内容更新合同模板...');
    
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: '121.41.65.220',
      user: 'h5_cloud_user',
      password: 'mc72TNcMmy6HCybH',
      port: 3306,
      database: 'h5_cloud_db',
      charset: 'utf8mb4'
    });

    console.log('✅ 数据库连接成功');

    // 基于实际PDF内容创建合同模板
    const actualPDFTemplate = {
      name: '石楠文化介绍服务合同（基于实际PDF）',
      type: 'MEMBERSHIP',
      template_content: `<!DOCTYPE html>
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
        .company-seal {
            text-align: center;
            margin: 30px 0;
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
        .package-section {
            margin: 20px 0;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background: #f9f9f9;
        }
        .package-title {
            font-weight: bold;
            color: #2c5aa0;
            font-size: 16px;
            margin-bottom: 10px;
        }
        .package-price {
            color: #e74c3c;
            font-weight: bold;
            font-size: 18px;
        }
        .service-list {
            margin: 10px 0;
            padding-left: 20px;
        }
        .service-item {
            margin: 5px 0;
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
            <div class="contract-clause">
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
                
                {{#each selectedPackages}}
                <div class="package-section">
                    <div class="package-title">{{this.letter}}.☑ {{this.name}} - 套餐总价：<span class="package-price">{{this.price}}元（人民币）</span></div>
                    <div>{{this.description}}</div>
                    {{#if this.services}}
                    <div class="service-list">
                        {{#each this.services}}
                        <div class="service-item">（{{@index}}）{{this}}</div>
                        {{/each}}
                    </div>
                    {{/if}}
                    {{#if this.duration}}
                    <p>服务有效期自本合同生效之日起{{this.duration}}个月。</p>
                    {{/if}}
                </div>
                {{/each}}
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
</html>`,
      variables_schema: JSON.stringify({
        "contractTitle": "石楠文化介绍服务合同",
        "contractNumber": "合同编号",
        "signingDate": "签订日期",
        "customerName": "甲方姓名",
        "companyName": "乙方公司名称",
        "selectedPackages": "选中的服务套餐",
        "selectedPackageNumbers": "选中的套餐编号",
        "paymentDays": "付款天数",
        "companyAccountInfo": "公司收款账户信息",
        "customerIdCard": "甲方身份证号",
        "customerPhone": "甲方联系电话"
      })
    };

    // 先插入新模板
    console.log('📝 插入基于实际PDF的合同模板...');
    const [insertResult] = await connection.execute(`
      INSERT INTO contract_templates (name, type, template_content, variables_schema, is_active) 
      VALUES (?, ?, ?, ?, ?)
    `, [
      actualPDFTemplate.name,
      actualPDFTemplate.type,
      actualPDFTemplate.template_content,
      actualPDFTemplate.variables_schema,
      true
    ]);

    const newTemplateId = insertResult.insertId;
    console.log(`✅ 新模板创建成功，ID: ${newTemplateId}`);

    // 更新所有合同的模板ID
    console.log('🔄 更新所有合同使用新模板...');
    const [updateResult] = await connection.execute(`
      UPDATE contracts 
      SET template_id = ?, updated_at = CURRENT_TIMESTAMP
    `, [newTemplateId]);
    
    console.log(`✅ 已更新 ${updateResult.affectedRows} 个合同使用新模板`);

    // 删除旧模板
    console.log('🗑️  删除旧模板...');
    const [deleteResult] = await connection.execute('DELETE FROM contract_templates WHERE id != ?', [newTemplateId]);
    console.log(`✅ 已删除 ${deleteResult.affectedRows} 个旧模板`);

    // 验证更新结果
    console.log('🔍 验证更新结果...');
    const [templates] = await connection.execute('SELECT id, name, type, is_active FROM contract_templates');
    
    console.log('📋 更新后的模板列表:');
    templates.forEach(template => {
      console.log(`  - ID: ${template.id}, 名称: ${template.name}, 类型: ${template.type}, 状态: ${template.is_active ? '启用' : '禁用'}`);
    });

    console.log('🎉 基于实际PDF的合同模板创建完成！');

  } catch (error) {
    console.error('❌ 创建失败:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 运行创建脚本
updateContractTemplateFromActualPDF().catch(console.error);
