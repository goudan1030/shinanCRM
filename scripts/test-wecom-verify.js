#!/usr/bin/env node

/**
 * 企业微信URL验证测试脚本
 * 
 * 用于测试企业微信URL验证功能
 * 模拟企业微信的验证请求
 */

const https = require('https');
const http = require('http');
const crypto = require('crypto');

// 配置
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TOKEN = 'AYJtHyibFqZzUJ6Gdn6jr'; // 与企业微信后台配置一致

/**
 * 生成企业微信签名
 */
function generateSignature(token, timestamp, nonce, echostr) {
  // 1. 将token、timestamp、nonce、echostr四个参数进行字典序排序
  const arr = [token, timestamp, nonce, echostr].sort();
  const str = arr.join('');
  
  console.log('签名生成详情:');
  console.log('  Token:', token);
  console.log('  Timestamp:', timestamp);
  console.log('  Nonce:', nonce);
  console.log('  Echostr:', echostr);
  console.log('  排序后数组:', arr);
  console.log('  拼接字符串:', str);
  
  // 2. 进行sha1加密
  const hash = crypto.createHash('sha1').update(str, 'utf8').digest('hex');
  console.log('  生成的签名:', hash);
  
  return hash;
}

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
        'Content-Type': 'text/plain',
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
 * 测试URL验证
 */
async function testURLVerification() {
  console.log('🧪 开始测试企业微信URL验证...');
  console.log('测试URL:', `${BASE_URL}/api/wecom/message`);
  console.log('使用Token:', TOKEN);
  
  // 生成测试参数
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = Math.random().toString(36).substring(2, 15);
  const echostr = 'test_echostr_' + Date.now();
  
  // 生成签名
  const msg_signature = generateSignature(TOKEN, timestamp, nonce, echostr);
  
  console.log('\n📋 测试参数:');
  console.log('  msg_signature:', msg_signature);
  console.log('  timestamp:', timestamp);
  console.log('  nonce:', nonce);
  console.log('  echostr:', echostr);
  
  // 构建URL
  const testUrl = `${BASE_URL}/api/wecom/message?msg_signature=${msg_signature}&timestamp=${timestamp}&nonce=${nonce}&echostr=${echostr}`;
  
  console.log('\n🔗 测试URL:');
  console.log(testUrl);
  
  try {
    console.log('\n📡 发送验证请求...');
    const response = await makeRequest(testUrl);
    
    console.log('\n📊 响应结果:');
    console.log('  状态码:', response.status);
    console.log('  响应内容:', response.data);
    console.log('  响应头:', response.headers);
    
    if (response.status === 200) {
      if (response.data === echostr) {
        console.log('\n✅ URL验证成功！');
        console.log('企业微信后台应该能够成功验证此URL');
      } else {
        console.log('\n⚠️ URL验证部分成功');
        console.log('服务器返回了200状态码，但响应内容不匹配');
        console.log('期望:', echostr);
        console.log('实际:', response.data);
      }
    } else {
      console.log('\n❌ URL验证失败');
      console.log('服务器返回了非200状态码');
    }
    
  } catch (error) {
    console.log('\n❌ 请求失败:', error.message);
  }
}

/**
 * 测试无参数请求
 */
async function testNoParamsRequest() {
  console.log('\n🧪 测试无参数请求...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/wecom/message`);
    
    console.log('📊 无参数响应结果:');
    console.log('  状态码:', response.status);
    console.log('  响应内容:', response.data);
    
    if (response.status === 200) {
      console.log('✅ 无参数请求处理正常');
    } else {
      console.log('❌ 无参数请求处理异常');
    }
    
  } catch (error) {
    console.log('❌ 无参数请求失败:', error.message);
  }
}

/**
 * 测试错误签名
 */
async function testInvalidSignature() {
  console.log('\n🧪 测试错误签名...');
  
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = Math.random().toString(36).substring(2, 15);
  const echostr = 'test_echostr_' + Date.now();
  const invalid_signature = 'invalid_signature';
  
  const testUrl = `${BASE_URL}/api/wecom/message?msg_signature=${invalid_signature}&timestamp=${timestamp}&nonce=${nonce}&echostr=${echostr}`;
  
  try {
    const response = await makeRequest(testUrl);
    
    console.log('📊 错误签名响应结果:');
    console.log('  状态码:', response.status);
    console.log('  响应内容:', response.data);
    
    if (response.status === 403) {
      console.log('✅ 错误签名被正确拒绝');
    } else {
      console.log('⚠️ 错误签名处理异常');
    }
    
  } catch (error) {
    console.log('❌ 错误签名测试失败:', error.message);
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🔧 企业微信URL验证测试工具');
  console.log('测试时间:', new Date().toLocaleString('zh-CN'));
  console.log('测试地址:', BASE_URL);
  
  // 1. 测试正确的URL验证
  await testURLVerification();
  
  // 2. 测试无参数请求
  await testNoParamsRequest();
  
  // 3. 测试错误签名
  await testInvalidSignature();
  
  console.log('\n🎯 测试完成！');
  console.log('\n💡 如果URL验证测试成功，请在企业微信后台重新保存配置');
  console.log('如果仍然失败，请检查：');
  console.log('1. 服务器是否正常运行');
  console.log('2. 域名是否已备案');
  console.log('3. 服务器IP是否在企业微信白名单中');
}

// 运行测试
if (require.main === module) {
  runTests().catch(error => {
    console.error('测试运行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  testURLVerification,
  testNoParamsRequest,
  testInvalidSignature,
  generateSignature
}; 