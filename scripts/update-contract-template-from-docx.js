#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function updateContractTemplateFromDocx() {
  let connection;
  
  try {
    console.log('🚀 开始基于DOCX文件更新合同模板...');
    
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

    // 基于您提供的实际合同内容创建新模板
    const newTemplate = {
      name: '石楠文化介绍服务合同',
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
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        .package-name {
            font-weight: bold;
            color: #2c5aa0;
        }
        .package-price {
            color: #e74c3c;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="contract-header">
        <h1>{{contractTitle}}</h1>
        <p class="contract-number">合同编号：{{contractNumber}}</p>
        <p>签署日期：{{signingDate}}</p>
    </div>
    
    <div class="contract-content">
        <div class="contract-clause">
            <p><strong>甲方（客户）：</strong>{{customerName}}</p>
            <p><strong>身份证号：</strong>{{customerIdCard}}</p>
            <p><strong>联系电话：</strong>{{customerPhone}}</p>
            <p><strong>乙方（服务方）：</strong>{{companyName}}</p>
            <p><strong>统一社会信用代码：</strong>{{companyTaxId}}</p>
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
            <p>优惠金额：{{discountAmount}}元</p>
            <p>实际支付金额：{{actualAmount}}元</p>
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
            <p>甲方（签字）：<span class="signature-line"></span></p>
            <p>签署日期：<span class="signature-line"></span></p>
        </div>
        <div>
            <p>乙方（盖章）：<span class="signature-line"></span></p>
            <p>签署日期：<span class="signature-line"></span></p>
        </div>
    </div>
    
    <div class="company-seal">
        <p>乙方公章：</p>
        <div style="width: 100px; height: 100px; border: 2px solid #000; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 12px; text-align: center;">{{companyName}}<br/>公章</span>
        </div>
    </div>
</body>
</html>`,
      variables_schema: JSON.stringify({
        "contractTitle": "石楠文化介绍服务合同",
        "contractNumber": "合同编号",
        "signingDate": "签署日期",
        "companyName": "公司名称",
        "companyTaxId": "统一社会信用代码",
        "customerName": "客户姓名",
        "customerIdCard": "身份证号",
        "customerPhone": "联系电话",
        "selectedPackages": "选中的服务套餐",
        "discountAmount": "优惠金额",
        "actualAmount": "实际支付金额"
      })
    };

    // 先插入新模板
    console.log('📝 插入基于DOCX的新合同模板...');
    const [insertResult] = await connection.execute(`
      INSERT INTO contract_templates (name, type, template_content, variables_schema, is_active) 
      VALUES (?, ?, ?, ?, ?)
    `, [
      newTemplate.name,
      newTemplate.type,
      newTemplate.template_content,
      newTemplate.variables_schema,
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

    console.log('🎉 基于DOCX文件的合同模板更新完成！');

  } catch (error) {
    console.error('❌ 更新失败:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 运行更新脚本
updateContractTemplateFromDocx().catch(console.error);
