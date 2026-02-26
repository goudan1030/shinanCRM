/**
 * API工具类
 * 提供统一的API响应格式和错误处理，所有响应都禁用缓存
 */

import { NextResponse } from 'next/server';
import { createLogger } from './logger';

// 创建API专用的日志记录器
const logger = createLogger('api');

/**
 * 标准API响应接口
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * API响应选项
 */
export interface ApiResponseOptions {
  status?: number;
  headers?: Record<string, string>;
}

/**
 * 创建成功响应（禁用缓存）
 */
export function createSuccessResponse<T>(
  data: T, 
  message?: string, 
  options: ApiResponseOptions = {}
): NextResponse {
  const { status = 200, headers = {} } = options;
  
  const response = NextResponse.json({
    success: true,
    data,
    message
  }, { status });
  
  // 禁用所有缓存
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  // 添加自定义头
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // 记录API成功响应
  logger.info(`API成功响应: ${status}`, {
    status,
    message
  });
  
  return response;
}

/**
 * 创建错误响应（禁用缓存）
 */
export function createErrorResponse(
  error: string, 
  status = 400, 
  options: ApiResponseOptions = {}
): NextResponse {
  const { headers = {} } = options;
  
  const response = NextResponse.json({
    success: false,
    error
  }, { status });
  
  // 禁用所有缓存
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  // 添加自定义头
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // 记录API错误响应
  logger.error(`API错误响应: ${status}`, {
    status,
    error
  });
  
  return response;
}

/**
 * API错误类
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 400,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 处理API错误
 */
export function handleApiError(error: unknown): NextResponse {
  console.error('API错误:', error);
  
  if (error instanceof ApiError) {
    return createErrorResponse(error.message, error.status);
  }
  
  if (error instanceof Error) {
    return createErrorResponse(error.message);
  }
  
  return createErrorResponse('服务器内部错误', 500);
}

/**
 * 验证必要的请求参数
 */
export function validateRequiredParams(params: Record<string, any>, required: string[]): void {
  for (const field of required) {
    if (params[field] === undefined || params[field] === null || params[field] === '') {
      throw new ApiError(`缺少必要参数: ${field}`, 400);
    }
  }
}

/**
 * 获取用户ID从请求头
 */
export function getUserIdFromHeaders(headers: Headers): string {
  const userId = headers.get('x-user-id');
  if (!userId) {
    throw new ApiError('未找到用户ID', 401);
  }
  return userId;
}

/**
 * 解析分页参数
 */
export function parsePaginationParams(url: URL): { page: number; pageSize: number; offset: number } {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '25')));
  const offset = (page - 1) * pageSize;
  
  return { page, pageSize, offset };
}

/**
 * 解析搜索参数
 */
export function parseSearchParams(url: URL): Record<string, string> {
  const params: Record<string, string> = {};
  
  for (const [key, value] of url.searchParams.entries()) {
    if (value && value.trim()) {
      params[key] = value.trim();
    }
  }
  
  return params;
}

/**
 * 格式化日期参数
 */
export function formatDateParam(dateString: string | null): string | null {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD格式
  } catch {
    return null;
  }
}

/**
 * 验证邮箱格式
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证手机号格式
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * 添加请求信息中间件
 */
export function withRequestInfo(
  handler: (req: Request, requestInfo: Record<string, any>) => Promise<NextResponse>
) {
  return async (req: Request) => {
    try {
      // 提取请求信息
      const requestInfo = {
        method: req.method,
        url: req.url,
        path: new URL(req.url).pathname,
      };
      
      // 调用处理程序并传递请求信息
      return await handler(req, requestInfo);
    } catch (error) {
      // 使用统一的错误处理
      return handleApiError(error);
    }
  };
}

// 导出常用状态码
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500
} as const; 