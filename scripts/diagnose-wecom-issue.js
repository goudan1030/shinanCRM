#!/usr/bin/env node

const https = require('https');
const crypto = require('crypto');

/**
 * 企业微信配置问题诊断工具
 */
async function diagnoseWecomIssue() {
  console.log('🔍 企业微信配置问题诊断');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const BASE_URL = 'https://admin.xinghun.info';
  const TOKEN = 'AYJtHyibFqZzUJ6Gdn6jr';
  
  console.log('📋 当前配置:');
  console.log(`URL: ${BASE_URL}/api/wecom/message`);
  console.log(`Token: ${TOKEN}`);
  console.log('');
  
  // 1. 测试URL可达性
  console.log('🔍 1. 测试URL可达性...');
  try {
    const response = await makeRequest(`${BASE_URL}/api/wecom/message`);
    console.log(`✅ URL可达，状态码: ${response.status}`);
    console.log(`响应内容: ${response.data.substring(0, 100)}...`);
  } catch (error) {
    console.log(`❌ URL不可达: ${error.message}`);
    return;
  }
  
  // 2. 测试无参数请求
  console.log('\n🔍 2. 测试无参数请求...');
  try {
    const response = await makeRequest(`${BASE_URL}/api/wecom/message`);
    console.log(`状态码: ${response.status}`);
    console.log(`响应内容: ${response.data}`);
    
    if (response.status === 200) {
      console.log('✅ 无参数请求正常');
    } else {
      console.log('❌ 无参数请求异常，这可能是问题所在');
    }
  } catch (error) {
    console.log(`❌ 无参数请求失败: ${error.message}`);
  }
  
  // 3. 测试企业微信标准验证
  console.log('\n🔍 3. 测试企业微信标准验证...');
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = Math.random().toString(36).substring(2, 15);
  const echostr = 'test_echostr_' + Date.now();
  
  // 企业微信官方签名算法
  const arr = [TOKEN, timestamp, nonce, echostr].sort();
  const str = arr.join('');
  const signature = crypto.createHash('sha1').update(str, 'utf8').digest('hex');
  
  console.log('签名详情:');
  console.log(`Token: ${TOKEN}`);
  console.log(`timestamp: ${timestamp}`);
  console.log(`nonce: ${nonce}`);
  console.log(`echostr: ${echostr}`);
  console.log(`排序后数组: [${arr.join(', ')}]`);
  console.log(`拼接字符串: ${str}`);
  console.log(`计算签名: ${signature}`);
  
  const testUrl = `${BASE_URL}/api/wecom/message?msg_signature=${signature}&timestamp=${timestamp}&nonce=${nonce}&echostr=${echostr}`;
  
  try {
    const response = await makeRequest(testUrl);
    console.log(`\n验证结果:`);
    console.log(`状态码: ${response.status}`);
    console.log(`响应内容: ${response.data}`);
    
    if (response.status === 200 && response.data === echostr) {
      console.log('✅ 企业微信标准验证通过！');
    } else {
      console.log('❌ 企业微信标准验证失败');
      console.log('可能的原因:');
      console.log('1. Token不匹配');
      console.log('2. 签名算法实现有误');
      console.log('3. 服务器代码未更新');
    }
  } catch (error) {
    console.log(`❌ 验证请求失败: ${error.message}`);
  }
  
  // 4. 提供解决方案
  console.log('\n🔧 解决方案:');
  console.log('1. 确保企业微信后台的Token为: AYJtHyibFqZzUJ6Gdn6jr');
  console.log('2. 确保URL为: https://admin.xinghun.info/api/wecom/message');
  console.log('3. 如果验证仍然失败，请等待几分钟让服务器部署最新代码');
  console.log('4. 检查企业微信后台的EncodingAESKey是否为43位字符');
  
  console.log('\n📞 如果问题持续存在，请提供以下信息:');
  console.log('- 企业微信后台的具体错误信息');
  console.log('- 本诊断工具的完整输出');
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

// 运行诊断
diagnoseWecomIssue().catch(console.error); 