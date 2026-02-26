#!/usr/bin/env node

/**
 * 企业微信会员查询功能测试脚本
 * 
 * 用于测试企业微信会员查询功能是否正常工作
 * 包括配置检查、连接测试、会员查询等
 */

const https = require('https');
const http = require('http');

// 配置
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_MEMBERS = [
  'M17071',
  '10921', 
  'A1234',
  '1A123',
  'B456C'
];

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
 * 测试配置检查
 */
async function testConfigCheck() {
  console.log('\n🔍 测试配置检查...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/wecom/config-check`);
    
    if (response.status === 200) {
      console.log('✅ 配置检查成功');
      console.log('配置状态:', response.data.overall);
      
      if (response.data.overall.allPassed) {
        console.log('🎉 所有配置检查通过！');
      } else {
        console.log('⚠️ 部分配置检查失败，请查看详细信息');
      }
    } else {
      console.log('❌ 配置检查失败:', response.status);
    }
  } catch (error) {
    console.log('❌ 配置检查出错:', error.message);
  }
}

/**
 * 测试状态监控
 */
async function testStatus() {
  console.log('\n📊 测试状态监控...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/wecom/status`);
    
    if (response.status === 200) {
      console.log('✅ 状态监控成功');
      console.log('连接状态:', response.data.connection.status);
      console.log('统计信息:', response.data.statistics.details);
    } else {
      console.log('❌ 状态监控失败:', response.status);
    }
  } catch (error) {
    console.log('❌ 状态监控出错:', error.message);
  }
}

/**
 * 测试会员查询
 */
async function testMemberQuery(memberNumber) {
  console.log(`\n🔍 测试会员查询: ${memberNumber}`);
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/wecom/test-query?number=${memberNumber}`);
    
    if (response.status === 200) {
      if (response.data.success) {
        console.log('✅ 会员查询成功');
        console.log('会员信息:', {
          id: response.data.memberInfo.id,
          member_no: response.data.memberInfo.member_no,
          nickname: response.data.memberInfo.nickname,
          gender: response.data.memberInfo.gender,
          type: response.data.memberInfo.type
        });
        
        if (response.data.wecomResult && response.data.wecomResult.success) {
          console.log('✅ 企业微信发送成功');
        } else {
          console.log('⚠️ 企业微信发送失败或未配置');
        }
      } else {
        console.log('❌ 会员查询失败:', response.data.message);
      }
    } else {
      console.log('❌ 会员查询请求失败:', response.status);
    }
  } catch (error) {
    console.log('❌ 会员查询出错:', error.message);
  }
}

/**
 * 测试POST查询
 */
async function testPostQuery(memberNumber) {
  console.log(`\n📝 测试POST查询: ${memberNumber}`);
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/wecom/test-query`, {
      method: 'POST',
      body: {
        memberNumber,
        testUser: 'test_user',
        agentId: '1000011'
      }
    });
    
    if (response.status === 200) {
      if (response.data.success) {
        console.log('✅ POST查询成功');
        console.log('查询结果:', response.data.memberFound ? '找到会员' : '未找到会员');
      } else {
        console.log('❌ POST查询失败:', response.data.message);
      }
    } else {
      console.log('❌ POST查询请求失败:', response.status);
    }
  } catch (error) {
    console.log('❌ POST查询出错:', error.message);
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🧪 开始企业微信会员查询功能测试');
  console.log('测试地址:', BASE_URL);
  console.log('测试时间:', new Date().toLocaleString('zh-CN'));
  
  // 1. 测试配置检查
  await testConfigCheck();
  
  // 2. 测试状态监控
  await testStatus();
  
  // 3. 测试会员查询
  for (const memberNumber of TEST_MEMBERS) {
    await testMemberQuery(memberNumber);
    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
  }
  
  // 4. 测试POST查询
  await testPostQuery('M17071');
  
  console.log('\n🎉 测试完成！');
  console.log('如果所有测试都通过，说明企业微信功能正常工作。');
  console.log('如果有失败的测试，请检查配置和网络连接。');
}

// 运行测试
if (require.main === module) {
  runTests().catch(error => {
    console.error('测试运行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  testConfigCheck,
  testStatus,
  testMemberQuery,
  testPostQuery,
  runTests
}; 