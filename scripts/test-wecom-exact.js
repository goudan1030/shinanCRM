#!/usr/bin/env node

const https = require('https');
const crypto = require('crypto');

/**
 * 精确模拟企业微信验证过程
 */
async function testWecomExact() {
  console.log('🔍 精确模拟企业微信验证过程');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const BASE_URL = 'https://admin.xinghun.info';
  const TOKEN = 'AYJtHyibFqZzUJ6Gdn6jr';
  
  // 模拟企业微信的验证参数
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = Math.random().toString(36).substring(2, 15);
  const echostr = 'test_echostr_' + Date.now();
  
  console.log('📋 验证参数:');
  console.log(`Token: ${TOKEN}`);
  console.log(`timestamp: ${timestamp}`);
  console.log(`nonce: ${nonce}`);
  console.log(`echostr: ${echostr}`);
  console.log('');
  
  // 企业微信官方签名算法
  const arr = [TOKEN, timestamp, nonce, echostr].sort();
  const str = arr.join('');
  const signature = crypto.createHash('sha1').update(str, 'utf8').digest('hex');
  
  console.log('🔐 签名计算:');
  console.log(`排序后数组: [${arr.join(', ')}]`);
  console.log(`拼接字符串: ${str}`);
  console.log(`计算签名: ${signature}`);
  console.log('');
  
  // 构建完整的验证URL
  const testUrl = `${BASE_URL}/api/wecom/message?msg_signature=${signature}&timestamp=${timestamp}&nonce=${nonce}&echostr=${echostr}`;
  
  console.log('🌐 测试URL:');
  console.log(testUrl);
  console.log('');
  
  // 发送请求
  console.log('📡 发送验证请求...');
  try {
    const response = await makeRequest(testUrl);
    
    console.log('📊 响应结果:');
    console.log(`状态码: ${response.status}`);
    console.log(`响应头:`, JSON.stringify(response.headers, null, 2));
    console.log(`响应内容: ${response.data}`);
    console.log('');
    
    if (response.status === 200) {
      if (response.data === echostr) {
        console.log('✅ 验证成功！响应内容与echostr完全匹配');
      } else {
        console.log('❌ 验证失败！响应内容与echostr不匹配');
        console.log(`期望: ${echostr}`);
        console.log(`实际: ${response.data}`);
      }
    } else {
      console.log('❌ 验证失败！HTTP状态码不是200');
    }
    
  } catch (error) {
    console.log('❌ 请求失败:', error.message);
  }
  
  // 测试不同的Content-Type
  console.log('\n🔍 测试不同的Content-Type...');
  await testWithHeaders(testUrl, { 'Accept': 'text/plain' });
  await testWithHeaders(testUrl, { 'Accept': 'application/json' });
  await testWithHeaders(testUrl, { 'Accept': '*/*' });
  
  // 测试User-Agent
  console.log('\n🔍 测试不同的User-Agent...');
  await testWithHeaders(testUrl, { 'User-Agent': 'WeChatWork/1.0' });
  await testWithHeaders(testUrl, { 'User-Agent': 'Mozilla/5.0' });
}

/**
 * 发送带自定义头的请求
 */
async function testWithHeaders(url, headers) {
  try {
    const response = await makeRequestWithHeaders(url, headers);
    const headerStr = Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join(', ');
    console.log(`[${headerStr}] - 状态码: ${response.status}, 内容: ${response.data.substring(0, 50)}...`);
  } catch (error) {
    const headerStr = Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join(', ');
    console.log(`[${headerStr}] - 失败: ${error.message}`);
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
          status: res.statusCode,
          data: data,
          headers: res.headers
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('请求超时'));
    });
  });
}

/**
 * 发送带自定义头的HTTP请求
 */
function makeRequestWithHeaders(url, headers) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: headers
    };
    
    const req = https.request(options, (res) => {
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
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('请求超时'));
    });
    
    req.end();
  });
}

// 运行测试
testWecomExact().catch(console.error); 