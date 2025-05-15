/**
 * 统一错误处理模块
 * 提供错误分类、格式化和通知机制
 */

import { NextResponse } from 'next/server';
import { createLogger } from './logger';
import { apiError, ApiResponseOptions } from './api-utils';

// 创建错误处理专用的日志记录器
const logger = createLogger('error-handler');

/**
 * 错误类型枚举
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  DATABASE = 'DATABASE_ERROR',
  NETWORK = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR',
  BUSINESS = 'BUSINESS_ERROR',
  THIRD_PARTY = 'THIRD_PARTY_ERROR'
}

/**
 * 错误严重程度
 */
export enum ErrorSeverity {
  LOW = 'LOW',         // 较低严重性，不影响主要功能
  MEDIUM = 'MEDIUM',   // 中等严重性，影响部分功能
  HIGH = 'HIGH',       // 高严重性，影响重要功能
  CRITICAL = 'CRITICAL' // 严重错误，系统无法正常工作
}

/**
 * 自定义应用错误
 */
export class AppError extends Error {
  public type: ErrorType;
  public severity: ErrorSeverity;
  public code?: string;
  public details?: Record<string, any>;
  public originalError?: Error;
  public httpStatusCode: number;

  constructor(options: {
    message: string;
    type?: ErrorType;
    severity?: ErrorSeverity;
    code?: string;
    details?: Record<string, any>;
    originalError?: Error;
    httpStatusCode?: number;
  }) {
    super(options.message);
    this.name = 'AppError';
    this.type = options.type || ErrorType.UNKNOWN;
    this.severity = options.severity || ErrorSeverity.MEDIUM;
    this.code = options.code;
    this.details = options.details;
    this.originalError = options.originalError;
    
    // 设置HTTP状态码
    this.httpStatusCode = options.httpStatusCode || this.getDefaultHttpStatusCode();
    
    // 捕获堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * 根据错误类型获取默认HTTP状态码
   */
  private getDefaultHttpStatusCode(): number {
    switch (this.type) {
      case ErrorType.VALIDATION:
        return 400; // Bad Request
      case ErrorType.AUTHENTICATION:
        return 401; // Unauthorized
      case ErrorType.AUTHORIZATION:
        return 403; // Forbidden
      case ErrorType.NOT_FOUND:
        return 404; // Not Found
      case ErrorType.DATABASE:
      case ErrorType.NETWORK:
      case ErrorType.BUSINESS:
      case ErrorType.THIRD_PARTY:
        return 500; // Internal Server Error
      default:
        return 500; // Internal Server Error
    }
  }

  /**
   * 获取用户友好的错误消息
   */
  public getUserFriendlyMessage(): string {
    switch (this.type) {
      case ErrorType.VALIDATION:
        return '输入数据验证失败，请检查您的输入';
      case ErrorType.AUTHENTICATION:
        return '认证失败，请重新登录';
      case ErrorType.AUTHORIZATION:
        return '您没有权限执行此操作';
      case ErrorType.NOT_FOUND:
        return '请求的资源不存在';
      case ErrorType.DATABASE:
        return '数据库操作失败，请稍后重试';
      case ErrorType.NETWORK:
        return '网络请求失败，请检查您的网络连接';
      case ErrorType.THIRD_PARTY:
        return '第三方服务请求失败，请稍后重试';
      case ErrorType.BUSINESS:
        return this.message; // 业务错误直接显示原始消息
      default:
        return '发生未知错误，请稍后重试';
    }
  }

  /**
   * 转换为API错误响应
   */
  public toApiResponse(options?: ApiResponseOptions): NextResponse {
    return apiError(
      this.getUserFriendlyMessage(),
      this.httpStatusCode,
      options?.headers
    );
  }
}

/**
 * 处理并记录错误
 * @param error 错误对象
 * @param contextInfo 上下文信息
 * @returns 格式化后的AppError
 */
export function handleError(
  error: unknown,
  contextInfo?: Record<string, any>
): AppError {
  // 如果已经是AppError，直接使用
  if (error instanceof AppError) {
    // 记录错误
    logError(error, contextInfo);
    return error;
  }

  // 将普通Error转换为AppError
  if (error instanceof Error) {
    const appError = new AppError({
      message: error.message,
      type: identifyErrorType(error),
      originalError: error,
      details: contextInfo
    });
    
    // 记录错误
    logError(appError, contextInfo);
    return appError;
  }

  // 处理非Error对象
  const message = error ? String(error) : '未知错误';
  const appError = new AppError({
    message,
    type: ErrorType.UNKNOWN,
    details: contextInfo
  });
  
  // 记录错误
  logError(appError, contextInfo);
  return appError;
}

/**
 * 识别错误类型
 */
function identifyErrorType(error: Error): ErrorType {
  const errorMessage = error.message.toLowerCase();
  const errorName = error.name.toLowerCase();
  
  if (errorName.includes('validation') || errorMessage.includes('validation')) {
    return ErrorType.VALIDATION;
  }
  
  if (errorName.includes('auth') || errorMessage.includes('unauthorized') || 
      errorMessage.includes('unauthenticated') || errorMessage.includes('token')) {
    return ErrorType.AUTHENTICATION;
  }
  
  if (errorMessage.includes('permission') || errorMessage.includes('forbidden') || 
      errorMessage.includes('access denied')) {
    return ErrorType.AUTHORIZATION;
  }
  
  if (errorMessage.includes('not found') || errorMessage.includes('404')) {
    return ErrorType.NOT_FOUND;
  }
  
  if (errorName.includes('sql') || errorMessage.includes('database') || 
      errorMessage.includes('query') || errorMessage.includes('sql')) {
    return ErrorType.DATABASE;
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('fetch') || 
      errorMessage.includes('timeout') || errorMessage.includes('connect')) {
    return ErrorType.NETWORK;
  }
  
  return ErrorType.UNKNOWN;
}

/**
 * 记录错误
 */
function logError(error: AppError, contextInfo?: Record<string, any>): void {
  const errorContext = {
    errorType: error.type,
    severity: error.severity,
    code: error.code,
    details: error.details || {},
    ...(contextInfo || {})
  };

  // 根据严重程度选择日志级别
  if (error.severity === ErrorSeverity.CRITICAL) {
    logger.fatal(error, errorContext);
    // 这里可以添加其他严重错误的通知机制，如邮件或短信通知
    sendErrorNotification(error);
  } else if (error.severity === ErrorSeverity.HIGH) {
    logger.error(error, errorContext);
    // 对于高严重性错误也可以发送通知
    sendErrorNotification(error);
  } else {
    logger.error(error, errorContext);
  }
}

/**
 * 发送错误通知（可以根据实际情况实现）
 */
function sendErrorNotification(error: AppError): void {
  // 这里可以实现发送邮件、短信或其他通知渠道的逻辑
  // 示例：
  logger.info('发送错误通知', { 
    errorType: error.type,
    message: error.message,
    severity: error.severity
  });
  
  // 实际项目中可以调用通知服务
  // 例如: emailService.sendErrorAlert(error)
}

/**
 * 创建验证错误
 */
export function createValidationError(message: string, details?: Record<string, any>): AppError {
  return new AppError({
    message,
    type: ErrorType.VALIDATION,
    severity: ErrorSeverity.LOW,
    details,
    httpStatusCode: 400
  });
}

/**
 * 创建认证错误
 */
export function createAuthenticationError(message: string = '认证失败'): AppError {
  return new AppError({
    message,
    type: ErrorType.AUTHENTICATION,
    severity: ErrorSeverity.MEDIUM,
    httpStatusCode: 401
  });
}

/**
 * 创建授权错误
 */
export function createAuthorizationError(message: string = '没有权限'): AppError {
  return new AppError({
    message,
    type: ErrorType.AUTHORIZATION,
    severity: ErrorSeverity.MEDIUM,
    httpStatusCode: 403
  });
}

/**
 * 创建资源不存在错误
 */
export function createNotFoundError(resource: string): AppError {
  return new AppError({
    message: `找不到${resource}`,
    type: ErrorType.NOT_FOUND,
    severity: ErrorSeverity.LOW,
    httpStatusCode: 404
  });
}

/**
 * 创建数据库错误
 */
export function createDatabaseError(message: string, originalError?: Error): AppError {
  return new AppError({
    message,
    type: ErrorType.DATABASE,
    severity: ErrorSeverity.HIGH,
    originalError,
    httpStatusCode: 500
  });
}

/**
 * 创建业务逻辑错误
 */
export function createBusinessError(message: string, code?: string): AppError {
  return new AppError({
    message,
    type: ErrorType.BUSINESS,
    severity: ErrorSeverity.MEDIUM,
    code,
    httpStatusCode: 400
  });
}

/**
 * API错误处理中间件
 */
export function apiErrorHandler(error: unknown, requestInfo?: Record<string, any>): NextResponse {
  const appError = handleError(error, requestInfo);
  return appError.toApiResponse();
} 