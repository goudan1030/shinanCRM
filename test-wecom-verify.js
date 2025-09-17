#!/usr/bin/env node

/**
 * 企业微信URL验证测试工具
 * 用于测试不同的签名算法和参数组合
 */

const crypto = require('crypto');
const https = require('https');

// 测试配置
const BASE_URL = 'https://admin.xinghun.info';
const TOKEN = 'L411dhQg';

// 测试用例
const testCases = [
  {
    name: '标准企业微信验证',
    timestamp: '1234567890',
    nonce: 'test123',
    echostr: 'test_echo_string',
    expectedResult: 'test_echo_string'
  },
  {
    name: '真实时间戳测试',
    timestamp: Math.floor(Date.now() / 1000).toString(),
    nonce: 'real_test_' + Math.random().toString(36).substr(2, 9),
    echostr: 'real_echo_' + Math.random().toString(36).substr(2, 9),
    expectedResult: null // 动态生成
  }
];

/**
 * 计算企业微信签名
 */
function calculateSignature(token, timestamp, nonce, echostr) {
  const params = [token, timestamp, nonce, echostr].sort();
  const str = params.join('');
  const hash = crypto.createHash('sha1').update(str, 'utf8').digest('hex');
  return hash;
}

/**
 * 测试URL验证
 */
async function testUrlVerification(url) {
  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        error: error.message
      });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        error: 'Request timeout'
      });
    });
  });
}

/**
 * 运行测试
 */
async function runTests() {
  console.log('🔍 企业微信URL验证测试工具');
  console.log('=====================================\n');
  
  for (const testCase of testCases) {
    console.log(`📋 测试: ${testCase.name}`);
    console.log(`   时间戳: ${testCase.timestamp}`);
    console.log(`   随机数: ${testCase.nonce}`);
    console.log(`   回显字符串: ${testCase.echostr}`);
    
    // 计算签名
    const signature = calculateSignature(TOKEN, testCase.timestamp, testCase.nonce, testCase.echostr);
    console.log(`   计算签名: ${signature}`);
    
    // 构建测试URL
    const testUrl = `${BASE_URL}/api/wecom/verify?msg_signature=${signature}&timestamp=${testCase.timestamp}&nonce=${testCase.nonce}&echostr=${testCase.echostr}`;
    console.log(`   测试URL: ${testUrl}`);
    
    // 发送请求
    const result = await testUrlVerification(testUrl);
    
    if (result.error) {
      console.log(`   ❌ 请求失败: ${result.error}`);
    } else {
      console.log(`   📊 状态码: ${result.statusCode}`);
      console.log(`   📄 响应内容: ${result.body}`);
      
      if (result.statusCode === 200 && result.body === testCase.echostr) {
        console.log(`   ✅ 验证成功！`);
      } else if (testCase.expectedResult === null && result.statusCode === 200) {
        console.log(`   ✅ 验证成功！返回: ${result.body}`);
      } else {
        console.log(`   ❌ 验证失败！`);
      }
    }
    
    console.log('');
  }
  
  // 测试其他验证端点
  console.log('🔍 测试其他验证端点');
  console.log('=====================================\n');
  
  const endpoints = [
    '/api/wecom/standard-verify',
    '/api/wecom/minimal-verify',
    '/api/wecom/message'
  ];
  
  for (const endpoint of endpoints) {
    console.log(`📋 测试端点: ${endpoint}`);
    
    const testCase = testCases[0]; // 使用第一个测试用例
    const signature = calculateSignature(TOKEN, testCase.timestamp, testCase.nonce, testCase.echostr);
    const testUrl = `${BASE_URL}${endpoint}?msg_signature=${signature}&timestamp=${testCase.timestamp}&nonce=${testCase.nonce}&echostr=${testCase.echostr}`;
    
    const result = await testUrlVerification(testUrl);
    
    if (result.error) {
      console.log(`   ❌ 请求失败: ${result.error}`);
    } else {
      console.log(`   📊 状态码: ${result.statusCode}`);
      console.log(`   📄 响应内容: ${result.body.substring(0, 100)}${result.body.length > 100 ? '...' : ''}`);
      
      if (result.statusCode === 200 && result.body === testCase.echostr) {
        console.log(`   ✅ 验证成功！`);
      } else {
        console.log(`   ❌ 验证失败！`);
      }
    }
    
    console.log('');
  }
}

// 运行测试
runTests().catch(console.error);
