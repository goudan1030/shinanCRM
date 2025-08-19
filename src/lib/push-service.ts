/**
 * iOS推送通知服务
 * 使用Apple Push Notification Service (APNs)
 */

import { executeQuery } from '@/lib/database-netlify';
import { logger } from '@/lib/logger';

// APNs配置
interface APNsConfig {
  keyId: string;
  teamId: string;
  bundleId: string;
  privateKey: string;
  environment: 'development' | 'production';
}

// 推送消息结构
interface PushMessage {
  title: string;
  body: string;
  badge?: number;
  sound?: string;
  data?: Record<string, any>;
}

// 推送结果
interface PushResult {
  success: boolean;
  message: string;
  sentCount: number;
  failedCount: number;
  errors?: string[];
}

class iOSPushService {
  private config: APNsConfig;

  constructor() {
    this.config = {
      keyId: process.env.APNS_KEY_ID || '',
      teamId: process.env.APNS_TEAM_ID || '',
      bundleId: process.env.APNS_BUNDLE_ID || '',
      privateKey: process.env.APNS_PRIVATE_KEY || '',
      environment: (process.env.APNS_ENVIRONMENT as 'development' | 'production') || 'development'
    };
  }

  /**
   * 发送推送通知给指定用户
   */
  async sendToUsers(userIds: number[], message: PushMessage): Promise<PushResult> {
    try {
      // 获取用户的设备令牌
      const deviceTokens = await this.getDeviceTokens(userIds);
      
      if (deviceTokens.length === 0) {
        return {
          success: false,
          message: '没有找到有效的设备令牌',
          sentCount: 0,
          failedCount: 0
        };
      }

      // 发送推送通知
      const results = await Promise.allSettled(
        deviceTokens.map(token => this.sendToDevice(token, message))
      );

      const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
      const failedCount = results.length - successCount;
      const errors = results
        .filter(r => r.status === 'rejected')
        .map(r => (r as PromiseRejectedResult).reason);

      return {
        success: successCount > 0,
        message: `推送完成: 成功 ${successCount} 个，失败 ${failedCount} 个`,
        sentCount: successCount,
        failedCount,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      logger.error('iOS推送失败', { error: error instanceof Error ? error.message : String(error) });
      return {
        success: false,
        message: '推送服务错误',
        sentCount: 0,
        failedCount: 0,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * 发送推送通知给所有用户
   */
  async sendToAllUsers(message: PushMessage): Promise<PushResult> {
    try {
      // 获取所有活跃的设备令牌
      const deviceTokens = await this.getAllDeviceTokens();
      
      if (deviceTokens.length === 0) {
        return {
          success: false,
          message: '没有找到有效的设备令牌',
          sentCount: 0,
          failedCount: 0
        };
      }

      // 分批发送，避免一次性发送太多
      const batchSize = 100;
      const batches = [];
      
      for (let i = 0; i < deviceTokens.length; i += batchSize) {
        batches.push(deviceTokens.slice(i, i + batchSize));
      }

      let totalSuccess = 0;
      let totalFailed = 0;
      const allErrors: string[] = [];

      for (const batch of batches) {
        const results = await Promise.allSettled(
          batch.map(token => this.sendToDevice(token, message))
        );

        totalSuccess += results.filter(r => r.status === 'fulfilled' && r.value).length;
        totalFailed += results.filter(r => r.status === 'rejected').length;
        
        results
          .filter(r => r.status === 'rejected')
          .forEach(r => allErrors.push((r as PromiseRejectedResult).reason));
      }

      return {
        success: totalSuccess > 0,
        message: `推送完成: 成功 ${totalSuccess} 个，失败 ${totalFailed} 个`,
        sentCount: totalSuccess,
        failedCount: totalFailed,
        errors: allErrors.length > 0 ? allErrors : undefined
      };

    } catch (error) {
      logger.error('iOS批量推送失败', { error: error instanceof Error ? error.message : String(error) });
      return {
        success: false,
        message: '批量推送服务错误',
        sentCount: 0,
        failedCount: 0,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * 获取指定用户的设备令牌
   */
  private async getDeviceTokens(userIds: number[]): Promise<string[]> {
    try {
      const query = `
        SELECT device_token 
        FROM device_tokens 
        WHERE user_id IN (?) AND platform = 'ios' AND is_active = 1
      `;
      
      const result = await executeQuery(query, [userIds]);
      return result.map((row: any) => row.device_token);
    } catch (error) {
      logger.error('获取设备令牌失败', { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  /**
   * 获取所有活跃的设备令牌
   */
  private async getAllDeviceTokens(): Promise<string[]> {
    try {
      const query = `
        SELECT device_token 
        FROM device_tokens 
        WHERE platform = 'ios' AND is_active = 1
      `;
      
      const result = await executeQuery(query);
      return result.map((row: any) => row.device_token);
    } catch (error) {
      logger.error('获取所有设备令牌失败', { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  /**
   * 发送推送通知到单个设备
   */
  private async sendToDevice(deviceToken: string, message: PushMessage): Promise<boolean> {
    try {
      // 构建APNs推送负载
      const payload = {
        aps: {
          alert: {
            title: message.title,
            body: message.body
          },
          badge: message.badge || 1,
          sound: message.sound || 'default',
          'content-available': 1
        },
        ...message.data
      };

      // 这里需要集成实际的APNs SDK
      // 由于需要APNs证书和密钥，这里先模拟发送
      logger.info('模拟发送iOS推送', {
        deviceToken: deviceToken.substring(0, 10) + '...',
        title: message.title,
        body: message.body
      });

      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 100));

      return true;
    } catch (error) {
      logger.error('发送iOS推送失败', { 
        deviceToken: deviceToken.substring(0, 10) + '...',
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }

  /**
   * 验证配置
   */
  validateConfig(): boolean {
    const requiredFields = ['keyId', 'teamId', 'bundleId', 'privateKey'];
    const missingFields = requiredFields.filter(field => !this.config[field as keyof APNsConfig]);
    
    if (missingFields.length > 0) {
      logger.error('APNs配置缺失', { missingFields });
      return false;
    }
    
    return true;
  }
}

// 创建单例实例
export const iosPushService = new iOSPushService();

/**
 * 发送公告推送
 */
export async function sendAnnouncementPush(userIds: number[] | null, title: string, content: string): Promise<PushResult> {
  const message: PushMessage = {
    title,
    body: content,
    badge: 1,
    sound: 'default',
    data: {
      type: 'announcement',
      timestamp: Date.now()
    }
  };

  if (userIds && userIds.length > 0) {
    return await iosPushService.sendToUsers(userIds, message);
  } else {
    return await iosPushService.sendToAllUsers(message);
  }
}

/**
 * 发送系统通知推送
 */
export async function sendSystemNoticePush(title: string, content: string): Promise<PushResult> {
  const message: PushMessage = {
    title,
    body: content,
    badge: 1,
    sound: 'default',
    data: {
      type: 'system_notice',
      timestamp: Date.now()
    }
  };

  return await iosPushService.sendToAllUsers(message);
}
