#!/usr/bin/env node

/**
 * 企业微信通知队列监控脚本
 * 
 * 功能：定期检查数据库中的通知队列，处理待发送的企业微信通知
 * 使用方式：
 * - 一次性执行：node scripts/monitor-notification-queue.js
 * - 持续监控：node scripts/monitor-notification-queue.js --daemon
 * - 系统cron：0 * * * * cd /path/to/project && node scripts/monitor-notification-queue.js
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// 配置
const CONFIG = {
  // API 地址 - 根据环境自动选择
  API_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  // 监控间隔（分钟）
  MONITOR_INTERVAL: parseInt(process.env.QUEUE_MONITOR_INTERVAL || '5'),
  // 最大重试次数
  MAX_RETRIES: 3,
  // 守护进程模式
  DAEMON_MODE: process.argv.includes('--daemon'),
  // 手动检查模式（不依赖触发器）
  MANUAL_MODE: process.argv.includes('--manual'),
  // 调试模式
  DEBUG: process.argv.includes('--debug') || process.env.NODE_ENV === 'development'
};

/**
 * 日志输出函数
 */
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  if (data) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

/**
 * 调用通知队列处理API
 */
function processNotificationQueue() {
  return new Promise((resolve, reject) => {
    let apiUrl;
    
    if (CONFIG.MANUAL_MODE) {
      // 手动模式：直接使用手动检查API
      apiUrl = `${CONFIG.API_URL}/api/wecom/manual-check`;
      log('info', '使用手动检查模式（不依赖数据库触发器）');
      tryApiCall(apiUrl).then(resolve).catch(reject);
    } else {
      // 自动模式：优先使用队列处理API，失败时使用手动检查API
      apiUrl = `${CONFIG.API_URL}/api/wecom/process-queue`;
      const fallbackUrl = `${CONFIG.API_URL}/api/wecom/manual-check`;
      
      tryApiCall(apiUrl)
        .then(resolve)
        .catch(error => {
          log('warn', '队列处理API失败，尝试备用方案', { error: error.message });
          tryApiCall(fallbackUrl)
            .then(resolve)
            .catch(reject);
        });
    }
  });
}

/**
 * 尝试调用API
 */
function tryApiCall(apiUrl) {
  return new Promise((resolve, reject) => {
    const url = new URL(apiUrl);
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'NotificationQueueMonitor/1.0',
        'Accept': 'application/json'
      },
      timeout: 30000 // 30秒超时
    };

    const requestModule = url.protocol === 'https:' ? https : http;
    
    if (CONFIG.DEBUG) {
      log('debug', '发送API请求', { url: apiUrl, options });
    }

    const req = requestModule.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          if (res.statusCode === 200) {
            log('info', '队列处理完成', {
              statusCode: res.statusCode,
              result: result
            });
            resolve(result);
          } else {
            log('error', '队列处理API返回错误', {
              statusCode: res.statusCode,
              result: result
            });
            reject(new Error(`API returned ${res.statusCode}: ${result.message || data}`));
          }
        } catch (parseError) {
          log('error', '解析API响应失败', {
            statusCode: res.statusCode,
            data: data.substring(0, 200),
            error: parseError.message
          });
          reject(parseError);
        }
      });
    });

    req.on('error', (error) => {
      log('error', '请求队列处理API失败', {
        error: error.message,
        code: error.code
      });
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      const timeoutError = new Error('Request timeout');
      log('error', '请求超时', { timeout: '30s' });
      reject(timeoutError);
    });

    req.end();
  });
}

/**
 * 执行一次监控检查
 */
async function runOnce() {
  log('info', '开始检查企业微信通知队列...');
  
  try {
    const result = await processNotificationQueue();
    
    if (result.success) {
      const stats = result.statistics || {};
      if (stats.total > 0) {
        log('info', `队列处理成功: 总计${stats.total}条, 成功${stats.success}条, 失败${stats.failed}条`);
      } else {
        log('info', '队列为空，无需处理');
      }
    } else {
      log('error', '队列处理失败', result);
    }
    
    return result;
    
  } catch (error) {
    log('error', '监控检查失败', {
      error: error.message,
      stack: CONFIG.DEBUG ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * 守护进程模式 - 持续监控
 */
async function runDaemon() {
  log('info', `启动守护进程模式，监控间隔: ${CONFIG.MONITOR_INTERVAL} 分钟`);
  
  let consecutiveErrors = 0;
  const maxConsecutiveErrors = 5;
  
  while (true) {
    try {
      await runOnce();
      consecutiveErrors = 0; // 重置错误计数
      
    } catch (error) {
      consecutiveErrors++;
      log('error', `监控出错 (连续错误: ${consecutiveErrors}/${maxConsecutiveErrors})`, {
        error: error.message
      });
      
      // 如果连续错误过多，延长等待时间
      if (consecutiveErrors >= maxConsecutiveErrors) {
        const extendedInterval = CONFIG.MONITOR_INTERVAL * 3;
        log('warn', `连续错误过多，延长监控间隔至 ${extendedInterval} 分钟`);
        await sleep(extendedInterval * 60 * 1000);
        consecutiveErrors = 0; // 重置计数
        continue;
      }
    }
    
    // 等待下次检查
    await sleep(CONFIG.MONITOR_INTERVAL * 60 * 1000);
  }
}

/**
 * 休眠函数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 优雅退出处理
 */
function setupGracefulShutdown() {
  const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
  
  signals.forEach(signal => {
    process.on(signal, () => {
      log('info', `收到${signal}信号，正在优雅退出...`);
      process.exit(0);
    });
  });
  
  process.on('uncaughtException', (error) => {
    log('error', '未捕获的异常', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    log('error', '未处理的Promise拒绝', {
      reason: reason,
      promise: promise
    });
    process.exit(1);
  });
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
企业微信通知队列监控脚本

使用方法：
  node scripts/monitor-notification-queue.js [选项]

选项：
  --daemon    持续监控模式（守护进程）
  --manual    手动检查模式（不依赖数据库触发器）
  --debug     调试模式，显示详细日志
  --help      显示此帮助信息

环境变量：
  NEXT_PUBLIC_SITE_URL      API基础地址 (默认: http://localhost:3000)
  QUEUE_MONITOR_INTERVAL    监控间隔，单位分钟 (默认: 5)
  NODE_ENV                 环境类型

示例：
  # 一次性检查
  node scripts/monitor-notification-queue.js
  
  # 持续监控
  node scripts/monitor-notification-queue.js --daemon
  
  # 手动检查模式（无数据库触发器权限时使用）
  node scripts/monitor-notification-queue.js --manual
  
  # 调试模式
  node scripts/monitor-notification-queue.js --debug
  
  # 系统cron设置（每5分钟检查一次）
  */5 * * * * cd /path/to/project && node scripts/monitor-notification-queue.js >> /var/log/notification-queue.log 2>&1
  
  # 如果没有数据库触发器权限，可以使用手动检查模式（每10分钟）
  */10 * * * * cd /path/to/project && node scripts/monitor-notification-queue.js --manual >> /var/log/notification-queue.log 2>&1
`);
}

/**
 * 主函数
 */
async function main() {
  // 显示帮助
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp();
    return;
  }
  
  // 设置优雅退出
  setupGracefulShutdown();
  
  // 显示配置信息
  log('info', '企业微信通知队列监控启动', {
    config: CONFIG,
    pid: process.pid,
    nodeVersion: process.version,
    platform: process.platform
  });
  
  try {
    if (CONFIG.DAEMON_MODE) {
      await runDaemon();
    } else {
      await runOnce();
      log('info', '单次检查完成');
    }
  } catch (error) {
    log('error', '监控脚本执行失败', {
      error: error.message,
      stack: CONFIG.DEBUG ? error.stack : undefined
    });
    process.exit(1);
  }
}

// 执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runOnce, runDaemon, processNotificationQueue }; 