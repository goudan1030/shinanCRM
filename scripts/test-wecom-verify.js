#!/usr/bin/env node

/**
 * 企业微信URL验证测试脚本
 * 
 * 用于测试企业微信URL验证功能是否正常工作
 */

const https = require('https');
const http = require('http');
const crypto = require('crypto');

// 配置
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TOKEN = 'AYJtHyibFqZzUJ6Gdn6jr';

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

    const req = client.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data,
          headers: res.headers
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

/**
 * 生成企业微信签名
 */
function generateWecomSignature(token, timestamp, nonce, echostr) {
  const arr = [token, timestamp, nonce, echostr].sort();
  const str = arr.join('');
  const hash = crypto.createHash('sha1').update(str, 'utf8').digest('hex').toLowerCase();
  
  console.log('生成签名详情:', {
    token,
    timestamp,
    nonce,
    echostr,
    sortedArray: arr,
    joinedString: str,
    signature: hash
  });
  
  return hash;
}

/**
 * 测试URL验证
 */
async function testURLVerification() {
  console.log('\n🔍 测试企业微信URL验证...');
  
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = Math.random().toString(36).substring(2, 15);
  const echostr = 'test_echostr_' + Date.now();
  
  // 生成签名
  const signature = generateWecomSignature(TOKEN, timestamp, nonce, echostr);
  
  // 构建URL
  const url = `${BASE_URL}/api/wecom/message?msg_signature=${signature}&timestamp=${timestamp}&nonce=${nonce}&echostr=${echostr}`;
  
  console.log('测试URL:', url);
  
  try {
    const response = await makeRequest(url);
    
    console.log('响应状态:', response.status);
    console.log('响应数据:', response.data);
    console.log('响应头:', response.headers);
    
    if (response.status === 200) {
      console.log('✅ URL验证成功！');
      console.log('返回的echostr:', response.data);
      
      if (response.data === echostr) {
        console.log('✅ echostr匹配正确！');
        return true;
      } else {
        console.log('❌ echostr不匹配');
        return false;
      }
    } else {
      console.log('❌ URL验证失败');
      return false;
    }
  } catch (error) {
    console.log('❌ 请求失败:', error.message);
    return false;
  }
}

/**
 * 测试生产环境URL
 */
async function testProductionURL() {
  console.log('\n🌐 测试生产环境URL...');
  
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = Math.random().toString(36).substring(2, 15);
  const echostr = 'prod_test_' + Date.now();
  
  // 生成签名
  const signature = generateWecomSignature(TOKEN, timestamp, nonce, echostr);
  
  // 构建生产环境URL
  const url = `https://admin.xinghun.info/api/wecom/message?msg_signature=${signature}&timestamp=${timestamp}&nonce=${nonce}&echostr=${echostr}`;
  
  console.log('生产环境URL:', url);
  
  try {
    const response = await makeRequest(url);
    
    console.log('响应状态:', response.status);
    console.log('响应数据:', response.data);
    
    if (response.status === 200) {
      console.log('✅ 生产环境URL验证成功！');
      return true;
    } else {
      console.log('❌ 生产环境URL验证失败');
      return false;
    }
  } catch (error) {
    console.log('❌ 生产环境请求失败:', error.message);
    return false;
  }
}

/**
 * 测试错误参数
 */
async function testErrorCases() {
  console.log('\n❌ 测试错误情况...');
  
  const testCases = [
    {
      name: '缺少msg_signature',
      url: `${BASE_URL}/api/wecom/message?timestamp=1234567890&nonce=test&echostr=test`
    },
    {
      name: '缺少timestamp',
      url: `${BASE_URL}/api/wecom/message?msg_signature=test&nonce=test&echostr=test`
    },
    {
      name: '缺少nonce',
      url: `${BASE_URL}/api/wecom/message?msg_signature=test&timestamp=1234567890&echostr=test`
    },
    {
      name: '缺少echostr',
      url: `${BASE_URL}/api/wecom/message?msg_signature=test&timestamp=1234567890&nonce=test`
    },
    {
      name: '错误的签名',
      url: `${BASE_URL}/api/wecom/message?msg_signature=wrong_signature&timestamp=1234567890&nonce=test&echostr=test`
    }
  ];
  
  for (const testCase of testCases) {
    try {
      const response = await makeRequest(testCase.url);
      console.log(`${testCase.name}: ${response.status} - ${response.data}`);
    } catch (error) {
      console.log(`${testCase.name}: 请求失败 - ${error.message}`);
    }
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🧪 企业微信URL验证测试');
  console.log('测试时间:', new Date().toLocaleString('zh-CN'));
  console.log('测试地址:', BASE_URL);
  console.log('使用Token:', TOKEN);
  
  // 1. 测试本地URL验证
  const localSuccess = await testURLVerification();
  
  // 2. 测试生产环境URL验证
  const prodSuccess = await testProductionURL();
  
  // 3. 测试错误情况
  await testErrorCases();
  
  console.log('\n🎯 测试结果总结:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`本地环境: ${localSuccess ? '✅ 通过' : '❌ 失败'}`);
  console.log(`生产环境: ${prodSuccess ? '✅ 通过' : '❌ 失败'}`);
  
  if (localSuccess && prodSuccess) {
    console.log('\n🎉 所有测试通过！企业微信URL验证功能正常。');
    console.log('现在可以在企业微信后台配置URL了。');
  } else {
    console.log('\n⚠️ 部分测试失败，请检查配置。');
  }
}

// 运行测试
if (require.main === module) {
  main().catch(error => {
    console.error('测试失败:', error);
    process.exit(1);
  });
}

module.exports = {
  testURLVerification,
  testProductionURL,
  testErrorCases
}; 