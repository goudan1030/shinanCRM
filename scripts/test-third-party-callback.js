#!/usr/bin/env node

/**
 * 第三方应用回调测试脚本
 * 
 * 用于测试第三方应用数据回调和指令回调功能
 * 参考文档：https://developer.work.weixin.qq.com/tutorial/detail/38
 */

const https = require('https');
const http = require('http');
const crypto = require('crypto');

// 配置
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TOKEN = 'AYJtHyibFqZzUJ6Gdn6jr';
const ENCODING_AES_KEY = 'W4Vd1DVgpG1r15PVTPHP94zEkjh8bnsWOnFBz4O8N2k';
const CORP_ID = 'ww36f730a2df7547e5';

/**
 * 企业微信加解密工具类
 */
class WecomCrypto {
  constructor(token, encodingAESKey, corpId) {
    this.token = token;
    this.encodingAESKey = encodingAESKey;
    this.corpId = corpId;
  }

  /**
   * 计算签名
   */
  getSignature(token, timestamp, nonce, echostr) {
    const arr = [token, timestamp, nonce, echostr].sort();
    const str = arr.join('');
    const hash = crypto.createHash('sha1').update(str, 'utf8').digest('hex');
    return hash;
  }

  /**
   * 加密消息
   */
  encrypt(message, corpId) {
    // 1. 将EncodingAESKey进行base64解码
    const key = Buffer.from(this.encodingAESKey + '=', 'base64');
    
    // 2. 生成16位随机字符串
    const randomStr = this.generateRandomString(16);
    
    // 3. 将消息长度转换为4字节的十六进制字符串
    const msgLen = message.length.toString(16).padStart(8, '0');
    
    // 4. 拼接消息
    const content = randomStr + msgLen + message + corpId;
    
    // 5. 使用PKCS7补位
    const pad = 32 - (content.length % 32);
    const paddedContent = content + String.fromCharCode(pad).repeat(pad);
    
    // 6. 使用AES加密
    const cipher = crypto.createCipher('aes-256-cbc', key);
    cipher.setAutoPadding(false);
    
    let encrypted = cipher.update(paddedContent, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    return encrypted;
  }

  /**
   * 生成随机字符串
   */
  generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
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

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

/**
 * 测试数据回调验证
 */
async function testDataCallbackVerification() {
  console.log('\n🧪 测试第三方应用数据回调验证...');
  
  const crypto = new WecomCrypto(TOKEN, ENCODING_AES_KEY, CORP_ID);
  
  // 生成测试参数
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = Math.random().toString(36).substring(2, 15);
  const echostr = 'test_echostr_' + Date.now();
  
  // 加密echostr
  const encryptedEchostr = crypto.encrypt(echostr, CORP_ID);
  
  // 生成签名
  const msg_signature = crypto.getSignature(TOKEN, timestamp, nonce, encryptedEchostr);
  
  // 构建URL
  const testUrl = `${BASE_URL}/api/wecom/callback/data?msg_signature=${msg_signature}&timestamp=${timestamp}&nonce=${nonce}&echostr=${encryptedEchostr}`;
  
  console.log('测试URL:', testUrl);
  
  try {
    const response = await makeRequest(testUrl);
    
    console.log('响应状态:', response.status);
    console.log('响应内容:', response.data);
    
    if (response.status === 200 && response.data === echostr) {
      console.log('✅ 数据回调验证成功！');
      return true;
    } else {
      console.log('❌ 数据回调验证失败');
      return false;
    }
  } catch (error) {
    console.log('❌ 数据回调验证请求失败:', error.message);
    return false;
  }
}

/**
 * 测试指令回调验证
 */
async function testCommandCallbackVerification() {
  console.log('\n🧪 测试第三方应用指令回调验证...');
  
  const crypto = new WecomCrypto(TOKEN, ENCODING_AES_KEY, CORP_ID);
  
  // 生成测试参数
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = Math.random().toString(36).substring(2, 15);
  const echostr = 'test_echostr_' + Date.now();
  
  // 加密echostr
  const encryptedEchostr = crypto.encrypt(echostr, CORP_ID);
  
  // 生成签名
  const msg_signature = crypto.getSignature(TOKEN, timestamp, nonce, encryptedEchostr);
  
  // 构建URL
  const testUrl = `${BASE_URL}/api/wecom/callback/command?msg_signature=${msg_signature}&timestamp=${timestamp}&nonce=${nonce}&echostr=${encryptedEchostr}`;
  
  console.log('测试URL:', testUrl);
  
  try {
    const response = await makeRequest(testUrl);
    
    console.log('响应状态:', response.status);
    console.log('响应内容:', response.data);
    
    if (response.status === 200 && response.data === echostr) {
      console.log('✅ 指令回调验证成功！');
      return true;
    } else {
      console.log('❌ 指令回调验证失败');
      return false;
    }
  } catch (error) {
    console.log('❌ 指令回调验证请求失败:', error.message);
    return false;
  }
}

/**
 * 测试数据回调POST
 */
async function testDataCallbackPost() {
  console.log('\n🧪 测试第三方应用数据回调POST...');
  
  const crypto = new WecomCrypto(TOKEN, ENCODING_AES_KEY, CORP_ID);
  
  // 生成测试参数
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = Math.random().toString(36).substring(2, 15);
  
  // 创建测试消息
  const testMessage = `<xml>
<ToUserName><![CDATA[toUser]]></ToUserName>
<FromUserName><![CDATA[fromUser]]></FromUserName>
<CreateTime>1348831860</CreateTime>
<MsgType><![CDATA[text]]></MsgType>
<Content><![CDATA[this is a test]]></Content>
<MsgId>1234567890123456</MsgId>
<AgentID>1</AgentID>
</xml>`;
  
  // 加密消息
  const encryptedMsg = crypto.encrypt(testMessage, CORP_ID);
  
  // 生成签名
  const msg_signature = crypto.getSignature(TOKEN, timestamp, nonce, encryptedMsg);
  
  // 创建XML请求体
  const requestBody = `<xml>
<Encrypt><![CDATA[${encryptedMsg}]]></Encrypt>
<MsgSignature><![CDATA[${msg_signature}]]></MsgSignature>
<TimeStamp>${timestamp}</TimeStamp>
<Nonce><![CDATA[${nonce}]]></Nonce>
</xml>`;
  
  // 构建URL
  const testUrl = `${BASE_URL}/api/wecom/callback/data?msg_signature=${msg_signature}&timestamp=${timestamp}&nonce=${nonce}`;
  
  console.log('测试URL:', testUrl);
  console.log('请求体:', requestBody);
  
  try {
    const response = await makeRequest(testUrl, {
      method: 'POST',
      body: requestBody,
      headers: {
        'Content-Type': 'text/xml'
      }
    });
    
    console.log('响应状态:', response.status);
    console.log('响应内容:', response.data);
    
    if (response.status === 200 && response.data === 'success') {
      console.log('✅ 数据回调POST成功！');
      return true;
    } else {
      console.log('❌ 数据回调POST失败');
      return false;
    }
  } catch (error) {
    console.log('❌ 数据回调POST请求失败:', error.message);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🔧 第三方应用回调测试工具');
  console.log('测试时间:', new Date().toLocaleString('zh-CN'));
  console.log('测试地址:', BASE_URL);
  console.log('Token:', TOKEN);
  console.log('EncodingAESKey:', ENCODING_AES_KEY.substring(0, 10) + '...');
  console.log('CorpId:', CORP_ID);
  
  // 1. 测试数据回调验证
  const dataCallbackOk = await testDataCallbackVerification();
  
  // 2. 测试指令回调验证
  const commandCallbackOk = await testCommandCallbackVerification();
  
  // 3. 测试数据回调POST
  const dataCallbackPostOk = await testDataCallbackPost();
  
  console.log('\n🎯 测试结果总结:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`数据回调验证: ${dataCallbackOk ? '✅ 通过' : '❌ 失败'}`);
  console.log(`指令回调验证: ${commandCallbackOk ? '✅ 通过' : '❌ 失败'}`);
  console.log(`数据回调POST: ${dataCallbackPostOk ? '✅ 通过' : '❌ 失败'}`);
  
  if (dataCallbackOk && commandCallbackOk && dataCallbackPostOk) {
    console.log('\n🎉 所有测试通过！第三方应用回调功能正常。');
    console.log('现在可以在企业微信第三方应用后台配置回调URL了。');
  } else {
    console.log('\n⚠️ 部分测试失败，请检查配置。');
  }
}

// 运行测试
if (require.main === module) {
  runTests().catch(error => {
    console.error('测试运行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  testDataCallbackVerification,
  testCommandCallbackVerification,
  testDataCallbackPost,
  WecomCrypto
}; 