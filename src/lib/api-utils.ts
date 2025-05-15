import { NextResponse } from 'next/server';
import { createLogger } from './logger';

// 创建API专用的日志记录器
const logger = createLogger('api');

/**
 * API响应状态类型
 */
export type ApiStatus = 'success' | 'error';

/**
 * API响应数据结构
 */
export interface ApiResponse<T = any> {
  status: ApiStatus;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
}

/**
 * 缓存控制类型
 */
export type CacheControlType = 'public' | 'private' | 'no-cache';

/**
 * 缓存控制选项
 */
export interface CacheControlOptions {
  type: CacheControlType;
  maxAge?: number;
  staleWhileRevalidate?: number;
  mustRevalidate?: boolean;
}

/**
 * API响应选项
 */
export interface ApiResponseOptions {
  status?: number;
  cache?: CacheControlOptions;
  headers?: Record<string, string>;
}

// 默认缓存选项
const defaultPublicCache: CacheControlOptions = {
  type: 'public',
  maxAge: 60,          // 60秒
  staleWhileRevalidate: 120 // 120秒
};

const defaultPrivateCache: CacheControlOptions = {
  type: 'private',
  maxAge: 30,          // 30秒
  staleWhileRevalidate: 60  // 60秒
};

const noCache: CacheControlOptions = {
  type: 'no-cache',
  mustRevalidate: true
};

/**
 * 生成缓存控制头
 */
function generateCacheControlHeader(options: CacheControlOptions): string {
  if (options.type === 'no-cache') {
    return 'no-cache, no-store, must-revalidate';
  }
  
  let header = options.type;
  
  if (options.maxAge !== undefined) {
    header += `, max-age=${options.maxAge}`;
  }
  
  if (options.staleWhileRevalidate !== undefined) {
    header += `, stale-while-revalidate=${options.staleWhileRevalidate}`;
  }
  
  if (options.mustRevalidate) {
    header += ', must-revalidate';
  }
  
  return header;
}

/**
 * 创建API成功响应
 */
export function apiSuccess<T>(
  data: T,
  message?: string,
  options: ApiResponseOptions = {}
): NextResponse {
  const { status = 200, cache = defaultPublicCache, headers = {} } = options;
  
  // 创建响应头
  const responseHeaders = new Headers(headers);
  responseHeaders.set('Cache-Control', generateCacheControlHeader(cache));
  responseHeaders.set('Vary', 'Accept, Accept-Encoding');
  
  if (cache.type === 'no-cache') {
    responseHeaders.set('Pragma', 'no-cache');
    responseHeaders.set('Expires', '0');
  }
  
  const response: ApiResponse<T> = {
    status: 'success',
    data,
    ...(message ? { message } : {})
  };
  
  // 记录API成功响应
  logger.info(`API成功响应: ${status}`, {
    status,
    path: headers['x-request-path'] || '未知路径',
    message
  });
  
  return NextResponse.json(response, { 
    status, 
    headers: responseHeaders
  });
}

/**
 * 创建API错误响应
 */
export function apiError(
  error: string | Error,
  status: number = 500,
  headers: Record<string, string> = {},
  code?: string
): NextResponse {
  // 创建响应头
  const responseHeaders = new Headers(headers);
  responseHeaders.set('Cache-Control', generateCacheControlHeader(noCache));
  responseHeaders.set('Pragma', 'no-cache');
  responseHeaders.set('Expires', '0');
  
  const errorMessage = error instanceof Error ? error.message : error;
  
  const response: ApiResponse = {
    status: 'error',
    error: errorMessage,
    ...(code ? { code } : {})
  };
  
  // 记录API错误响应
  logger.error(`API错误响应: ${status}`, {
    status,
    error: errorMessage,
    path: headers['x-request-path'] || '未知路径',
    code
  });
  
  return NextResponse.json(response, { 
    status, 
    headers: responseHeaders
  });
}

/**
 * 统一的API错误处理
 */
export function handleApiError(error: unknown, requestInfo?: Record<string, any>): NextResponse {
  // 引入错误处理器（动态导入避免循环依赖）
  const { apiErrorHandler } = require('./error-handler');
  return apiErrorHandler(error, requestInfo);
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
        // 添加其他您想要捕获的请求信息
      };
      
      // 调用处理程序并传递请求信息
      return await handler(req, requestInfo);
    } catch (error) {
      // 使用统一的错误处理
      return handleApiError(error, {
        method: req.method,
        url: req.url,
        path: new URL(req.url).pathname
      });
    }
  };
} 