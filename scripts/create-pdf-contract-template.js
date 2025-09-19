#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function createPDFContractTemplate() {
  let connection;
  
  try {
    console.log('🚀 创建基于PDF的合同模板...');
    
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: '8.149.244.105',
      user: 'h5_cloud_user',
      password: 'mc72TNcMmy6HCybH',
      port: 3306,
      database: 'h5_cloud_db',
      charset: 'utf8mb4'
    });

    console.log('✅ 数据库连接成功');

    // 基于PDF合同创建新的模板
    const pdfContractTemplate = {
      name: '石楠文化介绍服务合同（PDF版）',
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
        .package-list {
            margin: 15px 0;
        }
        .package-item {
            margin: 10px 0;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background: #f9f9f9;
        }
        .package-name {
            font-weight: bold;
            color: #2c5aa0;
            font-size: 16px;
        }
        .package-price {
            color: #e74c3c;
            font-weight: bold;
            font-size: 18px;
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
        .signature-field {
            border: 1px solid #000;
            width: 200px;
            height: 50px;
            display: inline-block;
            margin: 5px;
        }
    </style>
</head>
<body>
    <div class="contract-container">
        <div class="contract-header">
            <h1>{{contractTitle}}</h1>
            <p class="contract-number">合同编号：<span class="field-value">{{contractNumber}}</span></p>
            <p>签署日期：<span class="field-value">{{signingDate}}</span></p>
        </div>
        
        <div class="contract-content">
            <div class="contract-clause">
                <p><span class="field-label">甲方（客户）：</span><span class="field-value">{{customerName}}</span></p>
                <p><span class="field-label">身份证号：</span><span class="field-value">{{customerIdCard}}</span></p>
                <p><span class="field-label">联系电话：</span><span class="field-value">{{customerPhone}}</span></p>
                <p><span class="field-label">地址：</span><span class="field-value">{{customerAddress}}</span></p>
            </div>
            
            <div class="contract-clause">
                <p><span class="field-label">乙方（服务方）：</span><span class="field-value">{{companyName}}</span></p>
                <p><span class="field-label">统一社会信用代码：</span><span class="field-value">{{companyTaxId}}</span></p>
                <p><span class="field-label">地址：</span><span class="field-value">{{companyAddress}}</span></p>
                <p><span class="field-label">联系电话：</span><span class="field-value">{{companyPhone}}</span></p>
            </div>
            
            <div class="contract-clause">
                <h3>第一条 服务内容</h3>
                <p>乙方为甲方提供以下服务套餐：</p>
                <div class="package-list">
                    {{#each selectedPackages}}
                    <div class="package-item">
                        <div class="package-name">{{this.name}}</div>
                        <div>服务内容：{{this.description}}</div>
                        <div>服务期限：{{this.duration}}</div>
                        <div class="package-price">价格：人民币{{this.price}}元</div>
                    </div>
                    {{/each}}
                </div>
            </div>
            
            <div class="contract-clause">
                <h3>第二条 服务期限</h3>
                <p>服务期限根据所选套餐确定，自合同签署之日起计算：</p>
                <ul>
                    {{#each selectedPackages}}
                    <li>{{this.name}}：{{this.duration}}</li>
                    {{/each}}
                </ul>
            </div>
            
            <div class="contract-clause">
                <h3>第三条 服务费用</h3>
                <p>服务费用明细：</p>
                <ul>
                    {{#each selectedPackages}}
                    <li>{{this.name}}：人民币{{this.price}}元</li>
                    {{/each}}
                </ul>
                <p>优惠金额：<span class="field-value">{{discountAmount}}</span>元</p>
                <p>实际支付金额：<span class="field-value">{{actualAmount}}</span>元</p>
            </div>
            
            <div class="contract-clause">
                <h3>第四条 双方权利义务</h3>
                <p><strong>甲方权利义务：</strong></p>
                <ul>
                    <li>按时支付服务费用</li>
                    <li>提供真实有效的个人信息</li>
                    <li>配合乙方完成相关服务</li>
                    <li>遵守服务使用规则</li>
                </ul>
                <p><strong>乙方权利义务：</strong></p>
                <ul>
                    <li>按照约定提供优质服务</li>
                    <li>保护甲方个人信息安全</li>
                    <li>及时响应甲方合理需求</li>
                    <li>确保服务质量符合标准</li>
                </ul>
            </div>
            
            <div class="contract-clause">
                <h3>第五条 违约责任</h3>
                <p>任何一方违反本合同约定，应承担相应的违约责任，并赔偿对方因此遭受的损失。</p>
            </div>
            
            <div class="contract-clause">
                <h3>第六条 争议解决</h3>
                <p>因本合同引起的争议，双方应友好协商解决；协商不成的，可向有管辖权的人民法院起诉。</p>
            </div>
            
            <div class="contract-clause">
                <h3>第七条 其他条款</h3>
                <p>本合同一式两份，甲乙双方各执一份，具有同等法律效力。本合同自双方签署之日起生效。</p>
            </div>
        </div>
        
        <div class="signature-section">
            <div>
                <p>甲方（签字）：<span class="signature-field" id="customer-signature"></span></p>
                <p>签署日期：<span class="field-value">{{customerSignDate}}</span></p>
            </div>
            <div>
                <p>乙方（盖章）：<span class="signature-field" id="company-signature"></span></p>
                <p>签署日期：<span class="field-value">{{companySignDate}}</span></p>
            </div>
        </div>
        
        <div class="company-seal">
            <p>乙方公章：</p>
            <div style="width: 100px; height: 100px; border: 2px solid #000; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 12px; text-align: center;">{{companyName}}<br/>公章</span>
            </div>
        </div>
    </div>
</body>
</html>`,
      variables_schema: JSON.stringify({
        "contractTitle": "石楠文化介绍服务合同",
        "contractNumber": "合同编号",
        "signingDate": "签署日期",
        "customerName": "甲方姓名",
        "customerIdCard": "甲方身份证号",
        "customerPhone": "甲方联系电话",
        "customerAddress": "甲方地址",
        "companyName": "乙方公司名称",
        "companyTaxId": "乙方统一社会信用代码",
        "companyAddress": "乙方地址",
        "companyPhone": "乙方联系电话",
        "selectedPackages": "选中的服务套餐",
        "discountAmount": "优惠金额",
        "actualAmount": "实际支付金额",
        "customerSignDate": "甲方签署日期",
        "companySignDate": "乙方签署日期"
      })
    };

    // 先插入新模板
    console.log('📝 插入基于PDF的合同模板...');
    const [insertResult] = await connection.execute(`
      INSERT INTO contract_templates (name, type, template_content, variables_schema, is_active) 
      VALUES (?, ?, ?, ?, ?)
    `, [
      pdfContractTemplate.name,
      pdfContractTemplate.type,
      pdfContractTemplate.template_content,
      pdfContractTemplate.variables_schema,
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

    console.log('🎉 基于PDF的合同模板创建完成！');

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
createPDFContractTemplate().catch(console.error);
