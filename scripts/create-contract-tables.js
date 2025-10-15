#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function createContractTables() {
  let connection;
  
  try {
    console.log('🚀 开始创建合同管理表...');
    
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

    // 创建合同模板表
    console.log('📝 创建合同模板表...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS contract_templates (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL COMMENT '模板名称',
        type ENUM('MEMBERSHIP', 'ONE_TIME', 'ANNUAL') NOT NULL COMMENT '合同类型',
        template_content TEXT NOT NULL COMMENT '模板内容(HTML)',
        variables_schema JSON COMMENT '变量定义',
        is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) COMMENT='合同模板表'
    `);
    console.log('✅ 合同模板表创建成功');

    // 创建合同表
    console.log('📝 创建合同表...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS contracts (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        contract_number VARCHAR(50) UNIQUE NOT NULL COMMENT '合同编号',
        member_id BIGINT NOT NULL COMMENT '会员ID',
        contract_type ENUM('MEMBERSHIP', 'ONE_TIME', 'ANNUAL') NOT NULL COMMENT '合同类型',
        template_id BIGINT NOT NULL COMMENT '模板ID',
        status ENUM('DRAFT', 'PENDING', 'SIGNED', 'EXPIRED', 'CANCELLED') DEFAULT 'DRAFT' COMMENT '合同状态',
        content TEXT NOT NULL COMMENT '合同内容(HTML)',
        variables JSON COMMENT '变量数据',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        signed_at TIMESTAMP NULL COMMENT '签署时间',
        expires_at TIMESTAMP NULL COMMENT '过期时间',
        pdf_url VARCHAR(500) COMMENT 'PDF文件URL',
        signature_data JSON COMMENT '签名数据',
        signature_hash VARCHAR(64) COMMENT '签名哈希'
      ) COMMENT='合同表'
    `);
    console.log('✅ 合同表创建成功');

    // 创建合同签署记录表
    console.log('📝 创建合同签署记录表...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS contract_signatures (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        contract_id BIGINT NOT NULL COMMENT '合同ID',
        signer_type ENUM('CUSTOMER', 'COMPANY') NOT NULL COMMENT '签署方类型',
        signature_data TEXT NOT NULL COMMENT '签名数据(Base64)',
        signature_hash VARCHAR(64) NOT NULL COMMENT '签名哈希',
        signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '签署时间',
        ip_address VARCHAR(45) COMMENT 'IP地址',
        user_agent TEXT COMMENT '用户代理'
      ) COMMENT='合同签署记录表'
    `);
    console.log('✅ 合同签署记录表创建成功');

    // 创建索引
    console.log('📝 创建索引...');
    try {
      await connection.execute('CREATE INDEX idx_contracts_member_id ON contracts(member_id)');
      console.log('✅ 合同表会员ID索引创建成功');
    } catch (error) {
      console.log('⚠️ 合同表会员ID索引可能已存在:', error.message);
    }

    try {
      await connection.execute('CREATE INDEX idx_contracts_status ON contracts(status)');
      console.log('✅ 合同表状态索引创建成功');
    } catch (error) {
      console.log('⚠️ 合同表状态索引可能已存在:', error.message);
    }

    try {
      await connection.execute('CREATE INDEX idx_contracts_created_at ON contracts(created_at)');
      console.log('✅ 合同表创建时间索引创建成功');
    } catch (error) {
      console.log('⚠️ 合同表创建时间索引可能已存在:', error.message);
    }

    try {
      await connection.execute('CREATE INDEX idx_contract_signatures_contract_id ON contract_signatures(contract_id)');
      console.log('✅ 签署记录表合同ID索引创建成功');
    } catch (error) {
      console.log('⚠️ 签署记录表合同ID索引可能已存在:', error.message);
    }

    try {
      await connection.execute('CREATE INDEX idx_contract_templates_type ON contract_templates(type)');
      console.log('✅ 模板表类型索引创建成功');
    } catch (error) {
      console.log('⚠️ 模板表类型索引可能已存在:', error.message);
    }

    // 添加外键约束
    console.log('📝 添加外键约束...');
    try {
      await connection.execute('ALTER TABLE contracts ADD CONSTRAINT fk_contracts_member_id FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE');
      console.log('✅ 合同表外键约束添加成功');
    } catch (error) {
      console.log('⚠️ 合同表外键约束可能已存在或添加失败:', error.message);
    }

    try {
      await connection.execute('ALTER TABLE contracts ADD CONSTRAINT fk_contracts_template_id FOREIGN KEY (template_id) REFERENCES contract_templates(id) ON DELETE RESTRICT');
      console.log('✅ 合同表模板外键约束添加成功');
    } catch (error) {
      console.log('⚠️ 合同表模板外键约束可能已存在或添加失败:', error.message);
    }

    try {
      await connection.execute('ALTER TABLE contract_signatures ADD CONSTRAINT fk_contract_signatures_contract_id FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE');
      console.log('✅ 签署记录表外键约束添加成功');
    } catch (error) {
      console.log('⚠️ 签署记录表外键约束可能已存在或添加失败:', error.message);
    }

    // 插入默认模板数据
    console.log('📝 插入默认模板数据...');
    const membershipTemplate = {
      name: '会员服务合同模板',
      type: 'MEMBERSHIP',
      template_content: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{{contractTitle}}</title>
    <style>
        body { font-family: "Microsoft YaHei", Arial, sans-serif; line-height: 1.6; margin: 40px; }
        .contract-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .contract-content { margin: 30px 0; }
        .signature-section { margin-top: 50px; display: flex; justify-content: space-between; }
        .signature-line { border-bottom: 1px solid #000; width: 200px; display: inline-block; margin-left: 10px; }
        .contract-clause { margin: 15px 0; }
        .contract-number { font-weight: bold; color: #666; }
    </style>
</head>
<body>
    <div class="contract-header">
        <h1>{{contractTitle}}</h1>
        <p class="contract-number">合同编号：{{contractNumber}}</p>
        <p>签署日期：{{signDate}}</p>
    </div>
    
    <div class="contract-content">
        <div class="contract-clause">
            <p><strong>甲方：</strong>{{companyName}}</p>
            <p><strong>乙方：</strong>{{customerName}}</p>
            <p><strong>身份证号：</strong>{{customerIdCard}}</p>
            <p><strong>联系电话：</strong>{{customerPhone}}</p>
        </div>
        
        <div class="contract-clause">
            <h3>第一条 服务内容</h3>
            <p>甲方为乙方提供{{serviceType}}服务，具体包括：</p>
            <ul>
                <li>会员信息管理服务</li>
                <li>匹配推荐服务</li>
                <li>客户咨询服务</li>
                <li>其他相关服务</li>
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
                <li>按照约定提供优质服务</li>
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
            <p>因本合同引起的争议，双方应友好协商解决；协商不成的，可向有管辖权的人民法院起诉。</p>
        </div>
        
        <div class="contract-clause">
            <h3>第七条 其他条款</h3>
            <p>本合同一式两份，甲乙双方各执一份，具有同等法律效力。本合同自双方签署之日起生效。</p>
        </div>
    </div>
    
    <div class="signature-section">
        <div>
            <p>甲方（盖章）：<span class="signature-line"></span></p>
            <p>签署日期：<span class="signature-line"></span></p>
        </div>
        <div>
            <p>乙方（签字）：<span class="signature-line"></span></p>
            <p>签署日期：<span class="signature-line"></span></p>
        </div>
    </div>
</body>
</html>`,
      variables_schema: JSON.stringify({
        "contractTitle": "会员服务合同",
        "contractNumber": "合同编号",
        "signDate": "签署日期",
        "companyName": "公司名称",
        "customerName": "客户姓名",
        "customerIdCard": "身份证号",
        "customerPhone": "联系电话",
        "serviceType": "服务类型",
        "serviceDuration": "服务期限",
        "serviceFee": "服务费用"
      })
    };

    await connection.execute(`
      INSERT INTO contract_templates (name, type, template_content, variables_schema, is_active) 
      VALUES (?, ?, ?, ?, ?)
    `, [
      membershipTemplate.name,
      membershipTemplate.type,
      membershipTemplate.template_content,
      membershipTemplate.variables_schema,
      true
    ]);

    console.log('✅ 默认模板数据插入成功');

    // 验证表创建情况
    console.log('🔍 验证表创建情况...');
    
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'h5_cloud_db' 
      AND TABLE_NAME IN ('contract_templates', 'contracts', 'contract_signatures')
    `);

    console.log('📊 创建的表:');
    tables.forEach(table => {
      console.log(`  - ${table.TABLE_NAME}`);
    });

    // 检查模板数据
    const [templates] = await connection.execute('SELECT COUNT(*) as count FROM contract_templates');
    console.log(`📋 合同模板数量: ${templates[0].count}`);

    console.log('🎉 合同管理表创建完成！');

  } catch (error) {
    console.error('❌ 创建表失败:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 运行创建脚本
createContractTables().catch(console.error);
