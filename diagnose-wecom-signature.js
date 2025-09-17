#!/usr/bin/env node

/**
 * 企业微信签名算法诊断工具
 * 用于诊断企业微信后台使用的具体签名算法
 */

const crypto = require('crypto');
const https = require('https');

// 测试配置
const BASE_URL = 'https://admin.xinghun.info';
const TOKEN = 'L411dhQg';

/**
 * 测试所有可能的签名算法
 */
function testAllSignatureAlgorithms() {
  console.log('🔍 测试所有可能的签名算法');
  console.log('=====================================\n');
  
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
    },
    {
      name: 'MD5算法（字典序）',
      calculate: (token, timestamp, nonce, echostr) => {
        const params = [token, timestamp, nonce, echostr].sort();
        const str = params.join('');
        return crypto.createHash('md5').update(str, 'utf8').digest('hex');
      }
    },
    {
      name: 'MD5算法（直接拼接）',
      calculate: (token, timestamp, nonce, echostr) => {
        const str = token + timestamp + nonce + echostr;
        return crypto.createHash('md5').update(str, 'utf8').digest('hex');
      }
    }
  ];
  
  testCases.forEach(testCase => {
    console.log(`📋 ${testCase.name}`);
    console.log(`   时间戳: ${testCase.timestamp}`);
    console.log(`   随机数: ${testCase.nonce}`);
    console.log(`   回显字符串: ${testCase.echostr}`);
    console.log('');
    
    algorithms.forEach(algorithm => {
      const signature = algorithm.calculate(TOKEN, testCase.timestamp, testCase.nonce, testCase.echostr);
      console.log(`   ${algorithm.name}: ${signature}`);
    });
    
    console.log('');
  });
}

/**
 * 测试不同的参数名称
 */
async function testDifferentParameterNames() {
  console.log('🔍 测试不同的参数名称');
  console.log('=====================================\n');
  
  const testCase = {
    timestamp: '1234567890',
    nonce: 'test123',
    echostr: 'test_echo_string'
  };
  
  // 使用标准算法计算签名
  const signature = crypto.createHash('sha1')
    .update([TOKEN, testCase.timestamp, testCase.nonce, testCase.echostr].sort().join(''), 'utf8')
    .digest('hex');
  
  const parameterTests = [
    {
      name: '标准参数名',
      params: `msg_signature=${signature}&timestamp=${testCase.timestamp}&nonce=${testCase.nonce}&echostr=${testCase.echostr}`
    },
    {
      name: 'data参数名',
      params: `msg_signature=${signature}&timestamp=${testCase.timestamp}&nonce=${testCase.nonce}&data=${testCase.echostr}`
    },
    {
      name: 'echo参数名',
      params: `msg_signature=${signature}&timestamp=${testCase.timestamp}&nonce=${testCase.nonce}&echo=${testCase.echostr}`
    },
    {
      name: '小写参数名',
      params: `msg_signature=${signature}&timestamp=${testCase.timestamp}&nonce=${testCase.nonce}&echostr=${testCase.echostr}`
    }
  ];
  
  for (const paramTest of parameterTests) {
    console.log(`📋 ${paramTest.name}`);
    console.log(`   参数: ${paramTest.params}`);
    
    try {
      const result = await makeRequest(`${BASE_URL}/api/wecom/verify?${paramTest.params}`);
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
      console.log(`   ❌ 请求异常: ${error.message}`);
    }
    
    console.log('');
  }
}

/**
 * 测试企业微信可能使用的特殊签名算法
 */
function testWecomSpecialAlgorithms() {
  console.log('🔍 测试企业微信可能使用的特殊签名算法');
  console.log('=====================================\n');
  
  const testCase = {
    timestamp: '1234567890',
    nonce: 'test123',
    echostr: 'test_echo_string'
  };
  
  const specialAlgorithms = [
    {
      name: '企业微信官方算法1',
      calculate: (token, timestamp, nonce, echostr) => {
        // 按照企业微信官方文档的算法
        const arr = [token, timestamp, nonce, echostr].sort();
        const str = arr.join('');
        return crypto.createHash('sha1').update(str, 'utf8').digest('hex');
      }
    },
    {
      name: '企业微信官方算法2',
      calculate: (token, timestamp, nonce, echostr) => {
        // 不排序，直接拼接
        const str = token + timestamp + nonce + echostr;
        return crypto.createHash('sha1').update(str, 'utf8').digest('hex');
      }
    },
    {
      name: '企业微信官方算法3',
      calculate: (token, timestamp, nonce, echostr) => {
        // 固定顺序
        const str = timestamp + nonce + echostr + token;
        return crypto.createHash('sha1').update(str, 'utf8').digest('hex');
      }
    },
    {
      name: '企业微信官方算法4',
      calculate: (token, timestamp, nonce, echostr) => {
        // 使用MD5
        const arr = [token, timestamp, nonce, echostr].sort();
        const str = arr.join('');
        return crypto.createHash('md5').update(str, 'utf8').digest('hex');
      }
    }
  ];
  
  specialAlgorithms.forEach(algorithm => {
    const signature = algorithm.calculate(TOKEN, testCase.timestamp, testCase.nonce, testCase.echostr);
    console.log(`📋 ${algorithm.name}: ${signature}`);
  });
  
  console.log('');
}

/**
 * 发送HTTP请求
 */
function makeRequest(url) {
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
 * 主函数
 */
async function main() {
  console.log('🚀 企业微信签名算法诊断工具');
  console.log('=====================================\n');
  
  // 测试所有签名算法
  testAllSignatureAlgorithms();
  
  // 测试特殊算法
  testWecomSpecialAlgorithms();
  
  // 测试不同参数名称
  await testDifferentParameterNames();
  
  console.log('🎯 诊断完成！');
  console.log('如果所有测试都通过，但企业微信后台仍然报错，');
  console.log('可能是以下原因：');
  console.log('1. 企业微信后台使用了我们未测试的签名算法');
  console.log('2. 企业微信后台使用了不同的参数名称');
  console.log('3. 企业微信后台对URL编码有特殊要求');
  console.log('4. 企业微信后台的Token与我们配置的不一致');
  console.log('');
  console.log('建议：');
  console.log('1. 检查企业微信后台的Token配置');
  console.log('2. 尝试重新生成Token和EncodingAESKey');
  console.log('3. 检查企业微信后台的错误日志');
  console.log('4. 联系企业微信技术支持');
}

// 运行诊断
main().catch(console.error);
