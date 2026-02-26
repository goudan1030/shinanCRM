/**
 * 日志模块
 * 提供统一的日志记录功能，支持不同级别的日志和结构化日志
 */

// 日志级别类型
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

// 日志级别映射到数字，用于比较
const LOG_LEVEL_MAP: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4
};

// 当前环境
const ENV = process.env.NODE_ENV || 'development';

// 默认日志级别 (生产环境默认info，开发环境默认debug)
const DEFAULT_LOG_LEVEL: LogLevel = ENV === 'production' ? 'info' : 'debug';

// 当前日志级别 (可通过环境变量覆盖)
const CURRENT_LOG_LEVEL = (process.env.LOG_LEVEL as LogLevel) || DEFAULT_LOG_LEVEL;

/**
 * 日志选项接口
 */
interface LogOptions {
  level?: LogLevel;
  module?: string;
  context?: Record<string, any>;
}

/**
 * 生成带有时间戳的日志内容
 */
function formatLogMessage(
  level: LogLevel,
  message: string,
  options?: LogOptions
): Record<string, any> {
  const timestamp = new Date().toISOString();
  const module = options?.module || 'app';
  
  return {
    timestamp,
    level,
    module,
    message,
    ...(options?.context || {}),
    environment: ENV
  };
}

/**
 * 判断是否应该记录指定级别的日志
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_MAP[level] >= LOG_LEVEL_MAP[CURRENT_LOG_LEVEL];
}

/**
 * 记录日志
 */
function logMessage(level: LogLevel, message: string, options?: LogOptions): void {
  if (!shouldLog(level)) return;
  
  const logData = formatLogMessage(level, message, options);
  
  switch (level) {
    case 'debug':
      console.debug(JSON.stringify(logData));
      break;
    case 'info':
      console.info(JSON.stringify(logData));
      break;
    case 'warn':
      console.warn(JSON.stringify(logData));
      break;
    case 'error':
    case 'fatal':
      console.error(JSON.stringify(logData));
      break;
  }
}

/**
 * 记录错误对象
 */
function logError(error: Error, message: string, options?: LogOptions): void {
  const context = {
    ...(options?.context || {}),
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    }
  };
  
  logMessage('error', message, { ...options, context });
}

/**
 * 创建特定模块的日志记录器
 */
export function createLogger(module: string) {
  return {
    debug(message: string, context?: Record<string, any>): void {
      logMessage('debug', message, { module, context });
    },
    
    info(message: string, context?: Record<string, any>): void {
      logMessage('info', message, { module, context });
    },
    
    warn(message: string, context?: Record<string, any>): void {
      logMessage('warn', message, { module, context });
    },
    
    error(messageOrError: string | Error, contextOrMessage?: Record<string, any> | string): void {
      if (messageOrError instanceof Error) {
        const message = typeof contextOrMessage === 'string' ? contextOrMessage : '发生错误';
        const context = typeof contextOrMessage === 'object' ? contextOrMessage : undefined;
        logError(messageOrError, message, { module, context });
      } else {
        logMessage('error', messageOrError, { module, context: contextOrMessage as Record<string, any> });
      }
    },
    
    fatal(messageOrError: string | Error, contextOrMessage?: Record<string, any> | string): void {
      if (messageOrError instanceof Error) {
        const message = typeof contextOrMessage === 'string' ? contextOrMessage : '发生严重错误';
        const context = typeof contextOrMessage === 'object' ? contextOrMessage : undefined;
        logError(messageOrError, message, { module, context, level: 'fatal' });
      } else {
        logMessage('fatal', messageOrError, { module, context: contextOrMessage as Record<string, any>, level: 'fatal' });
      }
    }
  };
}

// 创建默认日志记录器
export const logger = createLogger('app');

// 默认导出
export default logger; 