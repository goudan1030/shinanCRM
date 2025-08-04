#!/usr/bin/env node

/**
 * 更新企业微信配置脚本
 * 
 * 用于更新企业微信配置，特别是EncodingAESKey
 */

const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || '8.149.244.105',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'h5_cloud_user',
  password: process.env.DB_PASSWORD || 'mc72TNcMmy6HCybH',
  database: process.env.DB_NAME || 'h5_cloud_db',
  ssl: {
    rejectUnauthorized: false
  }
};

// 创建数据库连接
async function executeQuery(sql, params = []) {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const [rows] = await connection.execute(sql, params);
    return [rows];
  } finally {
    await connection.end();
  }
}

/**
 * 更新企业微信配置
 */
async function updateWecomConfig() {
  try {
    console.log('🔧 更新企业微信配置...');
    
    const command = process.argv[2];
    const value = process.argv[3];
    
    if (command === 'token' && value) {
      // 更新Token
      console.log('✅ 更新Token');
      console.log('新Token:', value);
      
      const updateQuery = `
        UPDATE wecom_config 
        SET token = ?, updated_at = NOW()
        WHERE id = 1
      `;
      
      const [result] = await executeQuery(updateQuery, [value]);
      
      if (result.affectedRows > 0) {
        console.log('✅ Token更新成功');
      } else {
        console.log('❌ Token更新失败');
      }
      
    } else if (command === 'encoding' && value) {
      // 更新EncodingAESKey
      console.log('✅ 更新EncodingAESKey');
      
      // 验证EncodingAESKey格式
      if (value.length !== 43) {
        console.log('❌ EncodingAESKey必须是43位字符');
        console.log(`当前长度: ${value.length}`);
        return;
      }
      
      if (!/^[a-zA-Z0-9]+$/.test(value)) {
        console.log('❌ EncodingAESKey只能包含英文字母和数字');
        return;
      }
      
      console.log('新密钥:', value);
      
      const updateQuery = `
        UPDATE wecom_config 
        SET encoding_aes_key = ?, updated_at = NOW()
        WHERE id = 1
      `;
      
      const [result] = await executeQuery(updateQuery, [value]);
      
      if (result.affectedRows > 0) {
        console.log('✅ EncodingAESKey更新成功');
      } else {
        console.log('❌ EncodingAESKey更新失败');
      }
      
    } else {
      console.log('❌ 参数错误');
      console.log('使用方法:');
      console.log('  node scripts/update-wecom-config.js token <新Token>');
      console.log('  node scripts/update-wecom-config.js encoding <新EncodingAESKey>');
      return;
    }
    
    // 显示更新后的配置
    await showCurrentConfig();
    
  } catch (error) {
    console.error('❌ 更新配置失败:', error.message);
  }
}

/**
 * 显示当前配置
 */
async function showCurrentConfig() {
  try {
    console.log('📋 当前企业微信配置:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const [configRows] = await executeQuery('SELECT * FROM wecom_config WHERE id = 1');
    
    if (configRows.length === 0) {
      console.log('❌ 未找到企业微信配置');
      return;
    }
    
    const config = configRows[0];
    
    console.log(`企业ID: ${config.corp_id || '未配置'}`);
    console.log(`应用ID: ${config.agent_id || '未配置'}`);
    console.log(`Token: ${config.token || '未配置'}`);
    console.log(`EncodingAESKey: ${config.encoding_aes_key || '未配置'}`);
    console.log(`通知启用: ${config.member_notification_enabled ? '是' : '否'}`);
    console.log(`通知接收者: ${config.notification_recipients || '未配置'}`);
    console.log(`消息类型: ${config.message_type || 'text'}`);
    console.log(`创建时间: ${config.created_at}`);
    console.log(`更新时间: ${config.updated_at}`);
    
  } catch (error) {
    console.error('❌ 获取配置失败:', error.message);
  }
}

/**
 * 主函数
 */
async function main() {
  const command = process.argv[2];
  
  if (command === 'show' || !command) {
    await showCurrentConfig();
  } else if (command === 'token' || command === 'encoding') {
    await updateWecomConfig();
  } else {
    console.log('🔧 企业微信配置管理工具');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('使用方法:');
    console.log('  node scripts/update-wecom-config.js show                    # 显示当前配置');
    console.log('  node scripts/update-wecom-config.js token <新Token>         # 更新Token');
    console.log('  node scripts/update-wecom-config.js encoding <新EncodingAESKey> # 更新EncodingAESKey');
    console.log('');
    console.log('示例:');
    console.log('  node scripts/update-wecom-config.js show');
    console.log('  node scripts/update-wecom-config.js token "AYJtHyibFqZzUJ6Gdn6jr"');
    console.log('  node scripts/update-wecom-config.js encoding "W4Vd1DVgpG1r15PVTPHP94zEkjh8bnsWOnFBz4O8N2k"');
  }
}

// 运行脚本
if (require.main === module) {
  main().catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  updateWecomConfig,
  showCurrentConfig
}; 