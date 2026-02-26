#!/usr/bin/env node

const { performance } = require('perf_hooks');

async function testAPIPerformance() {
  console.log('🔍 开始API性能测试...\n');
  
  const testCases = [
    {
      name: '收入列表API',
      url: 'http://localhost:3000/api/finance/income/list?page=1&pageSize=10'
    },
    {
      name: '用户列表API', 
      url: 'http://localhost:3000/api/users?page=1&pageSize=10'
    },
    {
      name: '会话检查API',
      url: 'http://localhost:3000/api/auth/session'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`📊 测试: ${testCase.name}`);
    
    try {
      const startTime = performance.now();
      
      const response = await fetch(testCase.url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      const statusIcon = response.ok ? '✅' : '❌';
      const responseSize = response.headers.get('content-length') || 'Unknown';
      
      console.log(`   ${statusIcon} 状态: ${response.status}`);
      console.log(`   ⏱️  响应时间: ${duration.toFixed(2)}ms`);
      console.log(`   📦 响应大小: ${responseSize} bytes`);
      console.log('');
      
    } catch (error) {
      console.log(`   ❌ 请求失败: ${error.message}`);
      console.log('');
    }
  }
  
  console.log('✨ 性能测试完成！');
}

// 检查服务器是否启动
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/', {
      method: 'HEAD',
    });
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('🚀 CRM系统性能测试工具\n');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.log('❌ 服务器未启动，请先运行 npm run dev');
    process.exit(1);
  }
  
  console.log('✅ 服务器已启动，开始测试...\n');
  await testAPIPerformance();
}

main().catch(console.error); 