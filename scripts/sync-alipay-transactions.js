#!/usr/bin/env node

/**
 * 支付宝收款记录自动同步脚本
 * 
 * 使用方法：
 * 1. 配置环境变量：ALIPAY_APP_ID, ALIPAY_PRIVATE_KEY, ALIPAY_PUBLIC_KEY
 * 2. 手动执行：node scripts/sync-alipay-transactions.js
 * 3. 定时任务：添加到cron，每天凌晨1点执行
 *   0 1 * * * cd /path/to/project && node scripts/sync-alipay-transactions.js >> /var/log/alipay-sync.log 2>&1
 */

require('dotenv').config({ path: '.env.local' });
const https = require('https');
const http = require('http');

const ALIPAY_APP_ID = process.env.ALIPAY_APP_ID;
const ALIPAY_PRIVATE_KEY = process.env.ALIPAY_PRIVATE_KEY;
const ALIPAY_PUBLIC_KEY = process.env.ALIPAY_PUBLIC_KEY;
const ALIPAY_GATEWAY = process.env.ALIPAY_GATEWAY_URL || 'https://openapi.alipay.com/gateway.do';
const API_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// 同步昨天的数据（因为对账单通常有延迟）
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const syncDate = yesterday.toISOString().split('T')[0];

async function syncAlipayTransactions() {
  console.log(`[${new Date().toISOString()}] 开始同步支付宝收款记录: ${syncDate}`);

  if (!ALIPAY_APP_ID || !ALIPAY_PRIVATE_KEY) {
    console.error('错误: 支付宝配置不完整');
    console.error('请设置环境变量: ALIPAY_APP_ID, ALIPAY_PRIVATE_KEY, ALIPAY_PUBLIC_KEY');
    process.exit(1);
  }

  try {
    // 调用同步API
    const url = `${API_BASE_URL}/api/finance/alipay/sync?date=${syncDate}&operator_id=0`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log(`同步成功:`, result.data);
      console.log(`- 日期: ${result.data.date}`);
      console.log(`- 总数: ${result.data.total}`);
      console.log(`- 成功: ${result.data.success}`);
      console.log(`- 失败: ${result.data.failed}`);
    } else {
      console.error('同步失败:', result.error || result.message);
      process.exit(1);
    }
  } catch (error) {
    console.error('同步过程出错:', error);
    process.exit(1);
  }
}

// 执行同步
syncAlipayTransactions()
  .then(() => {
    console.log(`[${new Date().toISOString()}] 同步完成`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`[${new Date().toISOString()}] 同步失败:`, error);
    process.exit(1);
  });

