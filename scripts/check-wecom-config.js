#!/usr/bin/env node

/**
 * 企业微信配置检查脚本
 * 
 * 用于检查当前系统配置是否与企业微信后台配置一致
 * 帮助用户快速发现配置问题
 */

const https = require('https');
const http = require('http');

// 配置
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

/**
 * 发送HTTP请求
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    if (options.body) {
      requestOptions.body = JSON.stringify(options.body);
    }

    const req = client.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: jsonData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

/**
 * 检查配置状态
 */
async function checkConfigStatus() {
  console.log('\n🔍 检查企业微信配置状态...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/wecom/config-check`);
    
    if (response.status === 200) {
      const config = response.data;
      
      console.log('📊 配置检查结果:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // 数据库连接
      console.log(`数据库连接: ${config.database.status === 'success' ? '✅ 正常' : '❌ 失败'}`);
      if (config.database.error) {
        console.log(`   错误: ${config.database.error}`);
      }
      
      // 企业微信配置
      console.log(`企业微信配置: ${config.wecomConfig.status === 'success' ? '✅ 正常' : '❌ 失败'}`);
      if (config.wecomConfig.config) {
        console.log(`   企业ID: ${config.wecomConfig.config.corp_id || '未配置'}`);
        console.log(`   应用ID: ${config.wecomConfig.config.agent_id || '未配置'}`);
        console.log(`   通知启用: ${config.wecomConfig.config.member_notification_enabled ? '是' : '否'}`);
      }
      
      // Access Token
      console.log(`Access Token: ${config.accessToken.status === 'success' ? '✅ 正常' : '❌ 失败'}`);
      if (config.accessToken.token) {
        console.log(`   Token预览: ${config.accessToken.token}`);
      }
      
      // 消息发送测试
      console.log(`消息发送: ${config.messageTest.status === 'success' ? '✅ 正常' : '❌ 失败'}`);
      
      // 总体状态
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`总体状态: ${config.overall.allPassed ? '🎉 所有检查通过' : '⚠️ 部分检查失败'}`);
      
      return config.overall.allPassed;
    } else {
      console.log('❌ 配置检查失败:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ 配置检查出错:', error.message);
    return false;
  }
}

/**
 * 检查状态监控
 */
async function checkStatus() {
  console.log('\n📊 检查系统状态...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/wecom/status`);
    
    if (response.status === 200) {
      const status = response.data;
      
      console.log('📈 系统状态:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // 配置状态
      console.log(`配置状态: ${status.config.status === 'success' ? '✅ 正常' : '❌ 失败'}`);
      if (status.config.details) {
        console.log(`   企业ID: ${status.config.details.corpId || '未配置'}`);
        console.log(`   应用ID: ${status.config.details.agentId || '未配置'}`);
        console.log(`   通知启用: ${status.config.details.memberNotificationEnabled ? '是' : '否'}`);
      }
      
      // 连接状态
      console.log(`连接状态: ${status.connection.status === 'success' ? '✅ 正常' : '❌ 失败'}`);
      
      // 统计信息
      if (status.statistics.details) {
        console.log('📊 会员统计:');
        console.log(`   总会员数: ${status.statistics.details.totalMembers}`);
        console.log(`   今日新增: ${status.statistics.details.todayNewMembers}`);
        console.log(`   本月新增: ${status.statistics.details.monthNewMembers}`);
        console.log(`   活跃会员: ${status.statistics.details.activeMembers}`);
      }
      
      return true;
    } else {
      console.log('❌ 状态检查失败:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ 状态检查出错:', error.message);
    return false;
  }
}

/**
 * 生成配置建议
 */
function generateConfigSuggestions() {
  console.log('\n💡 企业微信后台配置建议:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  console.log('1. 📝 接收消息服务器配置:');
  console.log('   URL: https://admin.xinghun.info/api/wecom/message');
  console.log('   Token: L411dhQg (建议重新生成)');
  console.log('   EncodingAESKey: 点击"随机获取"生成43位密钥');
  
  console.log('\n2. ✅ 消息类型配置:');
  console.log('   ☑️ 用户发送的普通消息 (必需)');
  console.log('   ☑️ 自定义菜单操作 (可选)');
  console.log('   ☑️ 审批状态通知事件 (可选)');
  
  console.log('\n3. 🔐 应用权限配置:');
  console.log('   ☑️ 通讯录 - 读取企业通讯录');
  console.log('   ☑️ 应用 - 发送应用消息');
  console.log('   ☑️ 客户联系 - 读取客户信息 (可选)');
  
  console.log('\n4. 🌐 网络配置:');
  console.log('   ☑️ 确保服务器IP在企业微信白名单中');
  console.log('   ☑️ 确保域名已备案且与企业主体相关');
  
  console.log('\n5. 📱 测试步骤:');
  console.log('   1) 在企业微信后台保存配置');
  console.log('   2) 验证URL是否成功');
  console.log('   3) 在企业微信应用中发送测试消息');
  console.log('   4) 检查是否收到自动回复');
}

/**
 * 检查配置一致性
 */
async function checkConfigConsistency() {
  console.log('🔍 检查配置一致性...');
  
  try {
    // 检查当前Token
    const response = await makeRequest(`${BASE_URL}/api/wecom/config-check`);
    
    if (response.status === 200 && response.data.wecomConfig.config) {
      const currentToken = response.data.wecomConfig.config.token || 'L411dhQg';
      
      console.log('\n📋 当前系统配置:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Token: ${currentToken}`);
      console.log(`企业ID: ${response.data.wecomConfig.config.corp_id || '未配置'}`);
      console.log(`应用ID: ${response.data.wecomConfig.config.agent_id || '未配置'}`);
      
      console.log('\n⚠️ 配置一致性检查:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      if (!response.data.wecomConfig.config.corp_id) {
        console.log('❌ 企业ID未配置 - 需要在数据库中配置corp_id');
      } else {
        console.log('✅ 企业ID已配置');
      }
      
      if (!response.data.wecomConfig.config.agent_id) {
        console.log('❌ 应用ID未配置 - 需要在数据库中配置agent_id');
      } else {
        console.log('✅ 应用ID已配置');
      }
      
      if (currentToken === 'L411dhQg') {
        console.log('⚠️ 使用默认Token - 建议在企业微信后台重新生成Token');
      } else {
        console.log('✅ Token已自定义');
      }
      
    } else {
      console.log('❌ 无法获取当前配置信息');
    }
  } catch (error) {
    console.log('❌ 配置一致性检查失败:', error.message);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🔧 企业微信配置检查工具');
  console.log('检查时间:', new Date().toLocaleString('zh-CN'));
  console.log('检查地址:', BASE_URL);
  
  // 1. 检查配置状态
  const configOk = await checkConfigStatus();
  
  // 2. 检查系统状态
  const statusOk = await checkStatus();
  
  // 3. 检查配置一致性
  await checkConfigConsistency();
  
  // 4. 生成配置建议
  generateConfigSuggestions();
  
  console.log('\n🎯 检查完成！');
  
  if (configOk && statusOk) {
    console.log('✅ 系统配置正常，可以尝试在企业微信后台配置');
  } else {
    console.log('❌ 系统配置存在问题，请先解决上述问题');
  }
  
  console.log('\n📖 详细配置指南请参考: docs/企业微信配置指南.md');
}

// 运行检查
if (require.main === module) {
  main().catch(error => {
    console.error('检查失败:', error);
    process.exit(1);
  });
}

module.exports = {
  checkConfigStatus,
  checkStatus,
  checkConfigConsistency,
  generateConfigSuggestions
}; 