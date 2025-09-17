#!/usr/bin/env node

/**
 * 宝塔面板拦截测试工具
 * 用于测试宝塔面板是否拦截了企业微信回调请求
 */

const https = require('https');
const http = require('http');

// 测试配置
const BASE_URL = 'https://admin.xinghun.info';
const DIRECT_IP = '127.0.0.1'; // 内网IP
const DIRECT_PORT = 3000; // Next.js端口

/**
 * 测试宝塔面板拦截
 */
async function testBaotaBlocking() {
  console.log('🔍 测试宝塔面板是否拦截企业微信回调请求');
  console.log('=====================================\n');
  
  const testCases = [
    {
      name: '通过域名访问（经过宝塔Nginx）',
      url: `${BASE_URL}/api/wecom/verify?msg_signature=test&timestamp=1234567890&nonce=test123&echostr=test_echo_string`
    },
    {
      name: '通过内网IP访问（绕过宝塔）',
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
        console.log(`   ❌ 被宝塔防火墙拦截（403 Forbidden）`);
      } else if (result.statusCode === 400) {
        console.log(`   ⚠️  参数错误（400 Bad Request）`);
      } else if (result.statusCode === 502) {
        console.log(`   ❌ 宝塔Nginx代理错误（502 Bad Gateway）`);
      } else if (result.statusCode === 504) {
        console.log(`   ❌ 宝塔Nginx超时（504 Gateway Timeout）`);
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
  console.log('🔍 测试不同请求头的宝塔拦截情况');
  console.log('=====================================\n');
  
  const headers = [
    {
      name: '标准浏览器请求头',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    },
    {
      name: '企业微信请求头',
      headers: {
        'User-Agent': 'WeChatWork/1.0.0',
        'X-Forwarded-For': '101.132.0.1',
        'Accept': '*/*'
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
        console.log(`   ❌ 被宝塔防火墙拦截`);
      } else if (result.statusCode === 502) {
        console.log(`   ❌ 宝塔Nginx代理错误`);
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
 * 测试宝塔面板状态
 */
async function testBaotaStatus() {
  console.log('🔍 测试宝塔面板状态');
  console.log('=====================================\n');
  
  const statusChecks = [
    {
      name: '网站状态检查',
      url: `${BASE_URL}/`
    },
    {
      name: 'API状态检查',
      url: `${BASE_URL}/api/wecom/config-check`
    },
    {
      name: 'SSL证书检查',
      url: `${BASE_URL}/api/wecom/status`
    }
  ];
  
  for (const check of statusChecks) {
    console.log(`📋 ${check.name}: ${check.url}`);
    
    try {
      const result = await makeRequest(check.url);
      console.log(`   状态码: ${result.statusCode}`);
      
      if (result.statusCode === 200) {
        console.log(`   ✅ 正常`);
      } else if (result.statusCode === 403) {
        console.log(`   ❌ 被宝塔防火墙拦截`);
      } else if (result.statusCode === 502) {
        console.log(`   ❌ 宝塔Nginx代理错误`);
      } else {
        console.log(`   ⚠️  异常`);
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
  console.log('🚀 宝塔面板拦截测试工具');
  console.log('=====================================\n');
  
  // 测试宝塔面板状态
  await testBaotaStatus();
  
  // 测试宝塔拦截
  await testBaotaBlocking();
  
  // 测试请求头
  await testRequestHeaders();
  
  console.log('🎯 测试完成！');
  console.log('如果通过域名访问失败，但通过内网IP访问成功，');
  console.log('说明宝塔面板确实拦截了企业微信的回调请求。');
  console.log('');
  console.log('宝塔面板解决方案：');
  console.log('1. 检查宝塔防火墙设置');
  console.log('2. 检查Nginx配置');
  console.log('3. 检查宝塔安全设置');
  console.log('4. 检查SSL证书配置');
  console.log('5. 使用内网IP访问绕过宝塔');
}

// 运行测试
main().catch(console.error);
