#!/usr/bin/env node

/**
 * 企业微信请求调试工具
 * 用于捕获和分析企业微信后台发送的实际请求
 */

const crypto = require('crypto');
const https = require('https');

// 配置
const BASE_URL = 'https://admin.xinghun.info';
const TOKEN = 'L411dhQg';
const ENCODING_AES_KEY = 'ejQi7UvAHfTpDguYi51TOsXOKoxthfDS3QiEpExFmZ6';

/**
 * 测试不同的签名算法
 */
function testAllSignatureAlgorithms(token, timestamp, nonce, echostr) {
  console.log('🔍 测试所有可能的签名算法');
  console.log('=====================================\n');
  
  const algorithms = [
    {
      name: '标准算法（字典序排序）',
      calculate: (token, timestamp, nonce, echostr) => {
        const params = [token, timestamp, nonce, echostr].sort();
        const str = params.join('');
        return crypto.createHash('sha1').update(str, 'utf8').digest('hex');
      }
    },
    {
      name: '直接拼接算法',
      calculate: (token, timestamp, nonce, echostr) => {
        const str = token + timestamp + nonce + echostr;
        return crypto.createHash('sha1').update(str, 'utf8').digest('hex');
      }
    },
    {
      name: '固定顺序算法',
      calculate: (token, timestamp, nonce, echostr) => {
        const str = timestamp + nonce + echostr + token;
        return crypto.createHash('sha1').update(str, 'utf8').digest('hex');
      }
    },
    {
      name: '小写算法',
      calculate: (token, timestamp, nonce, echostr) => {
        const params = [token, timestamp, nonce, echostr].sort();
        const str = params.join('').toLowerCase();
        return crypto.createHash('sha1').update(str, 'utf8').digest('hex');
      }
    },
    {
      name: 'URL编码算法',
      calculate: (token, timestamp, nonce, echostr) => {
        const params = [token, timestamp, nonce, encodeURIComponent(echostr)].sort();
        const str = params.join('');
        return crypto.createHash('sha1').update(str, 'utf8').digest('hex');
      }
    }
  ];
  
  const testCases = [
    {
      name: '测试用例1',
      timestamp: '1234567890',
      nonce: 'test123',
      echostr: 'test_echo_string'
    },
    {
      name: '测试用例2',
      timestamp: Math.floor(Date.now() / 1000).toString(),
      nonce: 'real_test_' + Math.random().toString(36).substr(2, 9),
      echostr: 'real_echo_' + Math.random().toString(36).substr(2, 9)
    }
  ];
  
  testCases.forEach(testCase => {
    console.log(`📋 ${testCase.name}`);
    console.log(`   时间戳: ${testCase.timestamp}`);
    console.log(`   随机数: ${testCase.nonce}`);
    console.log(`   回显字符串: ${testCase.echostr}`);
    console.log('');
    
    algorithms.forEach(algorithm => {
      const signature = algorithm.calculate(token, testCase.timestamp, testCase.nonce, testCase.echostr);
      console.log(`   ${algorithm.name}: ${signature}`);
    });
    
    console.log('');
  });
}

/**
 * 测试所有验证端点
 */
async function testAllEndpoints() {
  console.log('🔍 测试所有验证端点');
  console.log('=====================================\n');
  
  const endpoints = [
    '/api/wecom/verify',
    '/api/wecom/standard-verify',
    '/api/wecom/minimal-verify',
    '/api/wecom/message',
    '/api/wecom/callback',
    '/api/wecom/callback/data',
    '/api/wecom/callback/command'
  ];
  
  const testCase = {
    timestamp: '1234567890',
    nonce: 'test123',
    echostr: 'test_echo_string'
  };
  
  // 使用标准算法计算签名
  const signature = crypto.createHash('sha1')
    .update([TOKEN, testCase.timestamp, testCase.nonce, testCase.echostr].sort().join(''), 'utf8')
    .digest('hex');
  
  for (const endpoint of endpoints) {
    console.log(`📋 测试端点: ${endpoint}`);
    
    // 测试不同的参数组合
    const paramCombinations = [
      {
        name: '标准参数',
        params: `msg_signature=${signature}&timestamp=${testCase.timestamp}&nonce=${testCase.nonce}&echostr=${testCase.echostr}`
      },
      {
        name: 'data参数',
        params: `msg_signature=${signature}&timestamp=${testCase.timestamp}&nonce=${testCase.nonce}&data=${testCase.echostr}`
      },
      {
        name: '小写参数',
        params: `msg_signature=${signature}&timestamp=${testCase.timestamp}&nonce=${testCase.nonce}&echostr=${testCase.echostr}`
      }
    ];
    
    for (const combination of paramCombinations) {
      console.log(`   ${combination.name}:`);
      
      const testUrl = `${BASE_URL}${endpoint}?${combination.params}`;
      console.log(`   URL: ${testUrl}`);
      
      try {
        const result = await makeRequest(testUrl);
        console.log(`   状态码: ${result.statusCode}`);
        console.log(`   响应: ${result.body.substring(0, 100)}${result.body.length > 100 ? '...' : ''}`);
        
        if (result.statusCode === 200 && result.body === testCase.echostr) {
          console.log(`   ✅ 验证成功！`);
        } else if (result.statusCode === 200 && result.body === 'success') {
          console.log(`   ✅ 验证成功！`);
        } else {
          console.log(`   ❌ 验证失败`);
        }
      } catch (error) {
        console.log(`   ❌ 请求失败: ${error.message}`);
      }
      
      console.log('');
    }
    
    console.log('---\n');
  }
}

/**
 * 发送HTTP请求
 */
function makeRequest(url) {
  return new Promise((resolve, reject) => {
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
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * 检查服务器状态
 */
async function checkServerStatus() {
  console.log('🔍 检查服务器状态');
  console.log('=====================================\n');
  
  const healthChecks = [
    {
      name: '配置检查',
      url: `${BASE_URL}/api/wecom/config-check`
    },
    {
      name: '状态检查',
      url: `${BASE_URL}/api/wecom/status`
    }
  ];
  
  for (const check of healthChecks) {
    console.log(`📋 ${check.name}: ${check.url}`);
    
    try {
      const result = await makeRequest(check.url);
      console.log(`   状态码: ${result.statusCode}`);
      
      if (result.statusCode === 200) {
        try {
          const data = JSON.parse(result.body);
          console.log(`   响应: ${JSON.stringify(data, null, 2).substring(0, 200)}...`);
        } catch (e) {
          console.log(`   响应: ${result.body.substring(0, 200)}...`);
        }
        console.log(`   ✅ 正常`);
      } else {
        console.log(`   ❌ 异常`);
      }
    } catch (error) {
      console.log(`   ❌ 请求失败: ${error.message}`);
    }
    
    console.log('');
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 企业微信请求调试工具');
  console.log('=====================================\n');
  
  // 检查服务器状态
  await checkServerStatus();
  
  // 测试签名算法
  testAllSignatureAlgorithms(TOKEN, '1234567890', 'test123', 'test_echo_string');
  
  // 测试所有端点
  await testAllEndpoints();
  
  console.log('🎯 调试完成！');
  console.log('如果所有测试都通过，但企业微信后台仍然报错，');
  console.log('可能是以下原因：');
  console.log('1. 企业微信后台缓存问题');
  console.log('2. IP白名单配置问题');
  console.log('3. 域名备案问题');
  console.log('4. 企业微信后台的签名算法与标准不同');
}

// 运行调试
main().catch(console.error);
