#!/usr/bin/env node

/**
 * WAF拦截测试工具
 * 用于测试阿里云WAF是否拦截了企业微信回调请求
 */

const https = require('https');
const http = require('http');

// 测试配置
const BASE_URL = 'https://admin.xinghun.info';
const DIRECT_IP = '47.243.124.xxx'; // 请替换为您的实际服务器IP
const DIRECT_PORT = 3000; // 请替换为您的实际端口

/**
 * 测试WAF拦截
 */
async function testWAFBlocking() {
  console.log('🔍 测试WAF是否拦截企业微信回调请求');
  console.log('=====================================\n');
  
  const testCases = [
    {
      name: '通过域名访问（经过WAF）',
      url: `${BASE_URL}/api/wecom/verify?msg_signature=test&timestamp=1234567890&nonce=test123&echostr=test_echo_string`
    },
    {
      name: '通过直接IP访问（绕过WAF）',
      url: `http://${DIRECT_IP}:${DIRECT_PORT}/api/wecom/verify?msg_signature=test&timestamp=1234567890&nonce=test123&echostr=test_echo_string`
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`📋 ${testCase.name}`);
    console.log(`   URL: ${testCase.url}`);
    
    try {
      const result = await makeRequest(testCase.url);
      console.log(`   状态码: ${result.statusCode}`);
      console.log(`   响应: ${result.body.substring(0, 100)}${result.body.length > 100 ? '...' : ''}`);
      
      if (result.statusCode === 200) {
        console.log(`   ✅ 请求成功`);
      } else if (result.statusCode === 403) {
        console.log(`   ❌ 被WAF拦截（403 Forbidden）`);
      } else if (result.statusCode === 400) {
        console.log(`   ⚠️  参数错误（400 Bad Request）`);
      } else {
        console.log(`   ❌ 请求失败`);
      }
    } catch (error) {
      console.log(`   ❌ 请求异常: ${error.message}`);
    }
    
    console.log('');
  }
}

/**
 * 测试不同的请求头
 */
async function testRequestHeaders() {
  console.log('🔍 测试不同请求头的WAF拦截情况');
  console.log('=====================================\n');
  
  const headers = [
    {
      name: '标准请求头',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    },
    {
      name: '企业微信请求头',
      headers: {
        'User-Agent': 'WeChatWork/1.0.0',
        'X-Forwarded-For': '101.132.0.1'
      }
    },
    {
      name: '空请求头',
      headers: {}
    }
  ];
  
  for (const headerTest of headers) {
    console.log(`📋 ${headerTest.name}`);
    
    try {
      const result = await makeRequestWithHeaders(
        `${BASE_URL}/api/wecom/verify?msg_signature=test&timestamp=1234567890&nonce=test123&echostr=test_echo_string`,
        headerTest.headers
      );
      
      console.log(`   状态码: ${result.statusCode}`);
      console.log(`   响应: ${result.body.substring(0, 100)}${result.body.length > 100 ? '...' : ''}`);
      
      if (result.statusCode === 200) {
        console.log(`   ✅ 请求成功`);
      } else if (result.statusCode === 403) {
        console.log(`   ❌ 被WAF拦截`);
      } else {
        console.log(`   ⚠️  其他错误`);
      }
    } catch (error) {
      console.log(`   ❌ 请求异常: ${error.message}`);
    }
    
    console.log('');
  }
}

/**
 * 发送HTTP请求
 */
function makeRequest(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.get(url, (res) => {
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
 * 发送带自定义请求头的HTTP请求
 */
function makeRequestWithHeaders(url, headers) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (url.startsWith('https') ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: headers
    };
    
    const req = protocol.request(options, (res) => {
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
    
    req.end();
  });
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 WAF拦截测试工具');
  console.log('=====================================\n');
  
  // 测试WAF拦截
  await testWAFBlocking();
  
  // 测试请求头
  await testRequestHeaders();
  
  console.log('🎯 测试完成！');
  console.log('如果通过域名访问失败，但通过直接IP访问成功，');
  console.log('说明WAF确实拦截了企业微信的回调请求。');
  console.log('');
  console.log('解决方案：');
  console.log('1. 在WAF中添加企业微信IP白名单');
  console.log('2. 配置WAF规则例外');
  console.log('3. 临时关闭WAF进行测试');
  console.log('4. 使用直接IP访问绕过WAF');
}

// 运行测试
main().catch(console.error);
