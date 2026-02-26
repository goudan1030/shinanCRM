const fetch = require('node-fetch');

// 测试配置
const BASE_URL = 'http://localhost:3000';
const TEST_TOKEN = 'your-test-token-here'; // 需要替换为实际的测试token

async function testPushAPI() {
  console.log('🧪 开始测试推送API...\n');

  // 测试1: 公告推送API
  console.log('1. 测试公告推送API');
  try {
    const announcementResponse = await fetch(`${BASE_URL}/api/messages/push/announcement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      },
      body: JSON.stringify({
        title: '测试公告',
        content: '这是一个测试公告内容',
        target_users: [1, 2, 3]
      })
    });

    const announcementResult = await announcementResponse.json();
    console.log('公告推送结果:', announcementResult);
  } catch (error) {
    console.error('公告推送测试失败:', error.message);
  }

  console.log('\n2. 测试系统通知API');
  try {
    const notificationResponse = await fetch(`${BASE_URL}/api/messages/push/system-notice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      },
      body: JSON.stringify({
        title: '测试系统通知',
        content: '这是一个测试系统通知内容'
      })
    });

    const notificationResult = await notificationResponse.json();
    console.log('系统通知结果:', notificationResult);
  } catch (error) {
    console.error('系统通知测试失败:', error.message);
  }

  console.log('\n3. 测试推送日志API');
  try {
    const logsResponse = await fetch(`${BASE_URL}/api/messages/push/logs?page=1&limit=10`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });

    const logsResult = await logsResponse.json();
    console.log('推送日志结果:', logsResult);
  } catch (error) {
    console.error('推送日志测试失败:', error.message);
  }

  console.log('\n4. 测试设备令牌注册API');
  try {
    const registerResponse = await fetch(`${BASE_URL}/api/messages/push/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      },
      body: JSON.stringify({
        device_token: 'test-device-token-123',
        platform: 'ios',
        app_version: '1.0.0'
      })
    });

    const registerResult = await registerResponse.json();
    console.log('设备令牌注册结果:', registerResult);
  } catch (error) {
    console.error('设备令牌注册测试失败:', error.message);
  }

  console.log('\n✅ 推送API测试完成');
}

// 如果直接运行此脚本
if (require.main === module) {
  testPushAPI().catch(console.error);
}

module.exports = { testPushAPI };
