/**
 * 企业微信官方加解密库 - Node.js实现
 * 
 * 用于第三方应用回调验证和消息加解密
 * 参考官方文档：https://developer.work.weixin.qq.com/tutorial/detail/38
 */

import { createHash, createCipher, createDecipher } from 'crypto';

/**
 * 企业微信加解密工具类
 */
export class WecomCrypto {
  private token: string;
  private encodingAESKey: string;
  private corpId: string;

  constructor(token: string, encodingAESKey: string, corpId: string) {
    this.token = token;
    this.encodingAESKey = encodingAESKey;
    this.corpId = corpId;
  }

  /**
   * 计算签名
   * 用于验证回调URL的有效性
   */
  getSignature(token: string, timestamp: string, nonce: string, echostr: string): string {
    // 1. 将token、timestamp、nonce、echostr四个参数进行字典序排序
    const arr = [token, timestamp, nonce, echostr].sort();
    const str = arr.join('');
    
    // 2. 将四个参数拼接成一个字符串进行sha1加密
    const hash = createHash('sha1').update(str, 'utf8').digest('hex');
    
    return hash;
  }

  /**
   * 验证签名
   */
  verifySignature(token: string, timestamp: string, nonce: string, echostr: string, signature: string): boolean {
    const calculatedSignature = this.getSignature(token, timestamp, nonce, echostr);
    return calculatedSignature === signature;
  }

  /**
   * 解密消息
   */
  decrypt(encodingAESKey: string, encryptedMsg: string): { message: string; corpId: string } {
    try {
      // 1. 将EncodingAESKey进行base64解码
      const key = Buffer.from(encodingAESKey + '=', 'base64');
      
      // 2. 将加密消息进行base64解码
      const encrypted = Buffer.from(encryptedMsg, 'base64');
      
      // 3. 使用AES解密
      const decipher = createDecipher('aes-256-cbc', key);
      decipher.setAutoPadding(false);
      
      let decrypted = decipher.update(encrypted, null, 'utf8');
      decrypted += decipher.final('utf8');
      
      // 4. 去除补位字符
      const pad = decrypted.charCodeAt(decrypted.length - 1);
      decrypted = decrypted.substring(0, decrypted.length - pad);
      
      // 5. 去除16位随机字符串
      const content = decrypted.substring(16);
      const msgLen = content.substring(0, 4);
      const message = content.substring(4, 4 + parseInt(msgLen, 16));
      const corpId = content.substring(4 + parseInt(msgLen, 16));
      
      return { message, corpId };
    } catch (error) {
      console.error('解密失败:', error);
      throw new Error('解密失败');
    }
  }

  /**
   * 加密消息
   */
  encrypt(encodingAESKey: string, message: string, corpId: string): string {
    try {
      // 1. 将EncodingAESKey进行base64解码
      const key = Buffer.from(encodingAESKey + '=', 'base64');
      
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
      const cipher = createCipher('aes-256-cbc', key);
      cipher.setAutoPadding(false);
      
      let encrypted = cipher.update(paddedContent, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      return encrypted;
    } catch (error) {
      console.error('加密失败:', error);
      throw new Error('加密失败');
    }
  }

  /**
   * 生成随机字符串
   */
  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 验证企业ID
   */
  verifyCorpId(corpId: string): boolean {
    return corpId === this.corpId;
  }
}

/**
 * 创建企业微信加解密实例
 */
export function createWecomCrypto(token: string, encodingAESKey: string, corpId: string): WecomCrypto {
  return new WecomCrypto(token, encodingAESKey, corpId);
} 