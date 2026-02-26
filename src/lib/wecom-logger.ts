/**
 * 企业微信日志记录工具
 * 
 * 提供企业微信相关的日志记录功能
 * 支持不同级别的日志记录和格式化输出
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  error?: Error;
}

/**
 * 企业微信日志记录器
 */
export class WecomLogger {
  private static instance: WecomLogger;
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // 最大日志条数

  private constructor() {}

  static getInstance(): WecomLogger {
    if (!WecomLogger.instance) {
      WecomLogger.instance = new WecomLogger();
    }
    return WecomLogger.instance;
  }

  /**
   * 记录调试日志
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * 记录信息日志
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * 记录警告日志
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * 记录错误日志
   */
  error(message: string, error?: Error, data?: any): void {
    this.log(LogLevel.ERROR, message, data, error);
  }

  /**
   * 记录企业微信URL验证日志
   */
  logUrlVerification(params: {
    msg_signature?: string;
    timestamp?: string;
    nonce?: string;
    echostr?: string;
    success: boolean;
    error?: string;
  }): void {
    this.info('企业微信URL验证', {
      ...params,
      echostr: params.echostr ? params.echostr.substring(0, 20) + '...' : null
    });
  }

  /**
   * 记录企业微信消息接收日志
   */
  logMessageReceived(params: {
    msg_signature?: string;
    timestamp?: string;
    nonce?: string;
    msgType?: string;
    fromUser?: string;
    content?: string;
    success: boolean;
    error?: string;
  }): void {
    this.info('企业微信消息接收', {
      ...params,
      content: params.content ? params.content.substring(0, 50) + '...' : null
    });
  }

  /**
   * 记录企业微信消息发送日志
   */
  logMessageSent(params: {
    toUser: string;
    msgType: string;
    success: boolean;
    error?: string;
    response?: any;
  }): void {
    this.info('企业微信消息发送', params);
  }

  /**
   * 记录企业微信配置检查日志
   */
  logConfigCheck(params: {
    configExists: boolean;
    accessTokenValid: boolean;
    messageTestSuccess: boolean;
    error?: string;
  }): void {
    this.info('企业微信配置检查', params);
  }

  /**
   * 内部日志记录方法
   */
  private log(level: LogLevel, message: string, data?: any, error?: Error): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      error
    };

    this.logs.push(entry);

    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // 控制台输出
    const prefix = `[${entry.timestamp}] [${level}] [企业微信]`;
    const logMessage = `${prefix} ${message}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.log(logMessage, data || '');
        break;
      case LogLevel.INFO:
        console.log(logMessage, data || '');
        break;
      case LogLevel.WARN:
        console.warn(logMessage, data || '');
        break;
      case LogLevel.ERROR:
        console.error(logMessage, error || data || '');
        break;
    }
  }

  /**
   * 获取最近的日志
   */
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * 获取指定级别的日志
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * 获取错误日志
   */
  getErrorLogs(): LogEntry[] {
    return this.getLogsByLevel(LogLevel.ERROR);
  }

  /**
   * 清空日志
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * 获取日志统计信息
   */
  getLogStats(): {
    total: number;
    byLevel: Record<LogLevel, number>;
    recentErrors: number;
  } {
    const byLevel = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 0,
      [LogLevel.WARN]: 0,
      [LogLevel.ERROR]: 0
    };

    this.logs.forEach(log => {
      byLevel[log.level]++;
    });

    const recentErrors = this.logs
      .slice(-100)
      .filter(log => log.level === LogLevel.ERROR).length;

    return {
      total: this.logs.length,
      byLevel,
      recentErrors
    };
  }
}

// 导出单例实例
export const wecomLogger = WecomLogger.getInstance(); 