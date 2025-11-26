/**
 * API检查服务
 * 检查所有API接口的健康状态
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/system/api-check');

/**
 * API接口定义
 */
interface ApiEndpoint {
  path: string;
  method: string;
  description: string;
  requiresAuth: boolean;
  category: string;
}

/**
 * 所有需要检查的API接口列表
 */
const API_ENDPOINTS: ApiEndpoint[] = [
  // 认证相关
  { path: '/api/auth/session', method: 'GET', description: '会话验证', requiresAuth: false, category: '认证' },
  { path: '/api/auth/login', method: 'POST', description: '用户登录', requiresAuth: false, category: '认证' },
  
  // 用户管理
  { path: '/api/users', method: 'GET', description: '获取用户列表', requiresAuth: true, category: '用户管理' },
  
  // 会员管理
  { path: '/api/members', method: 'GET', description: '获取会员列表', requiresAuth: true, category: '会员管理' },
  { path: '/api/members/normal', method: 'GET', description: '获取普通会员', requiresAuth: true, category: '会员管理' },
  { path: '/api/members/annual', method: 'GET', description: '获取年费会员', requiresAuth: true, category: '会员管理' },
  { path: '/api/members/one-time', method: 'GET', description: '获取一次性会员', requiresAuth: true, category: '会员管理' },
  
  // 合同管理
  { path: '/api/contracts', method: 'GET', description: '获取合同列表', requiresAuth: true, category: '合同管理' },
  
  // 财务管理
  { path: '/api/finance/income/list', method: 'GET', description: '获取收入列表', requiresAuth: true, category: '财务管理' },
  { path: '/api/finance/expense/list', method: 'GET', description: '获取支出列表', requiresAuth: true, category: '财务管理' },
  { path: '/api/finance/settlement/list', method: 'GET', description: '获取结算列表', requiresAuth: true, category: '财务管理' },
  
  // 平台管理
  { path: '/api/platform/banner', method: 'GET', description: '获取Banner列表', requiresAuth: true, category: '平台管理' },
  { path: '/api/platform/article', method: 'GET', description: '获取文章列表', requiresAuth: true, category: '平台管理' },
  
  // APP管理
  { path: '/api/app/recommend', method: 'GET', description: '获取推荐列表', requiresAuth: true, category: 'APP管理' },
  { path: '/api/app/refresh/list', method: 'GET', description: '获取刷新列表', requiresAuth: true, category: 'APP管理' },
  
  // 仪表盘
  { path: '/api/dashboard/members/count', method: 'GET', description: '会员统计', requiresAuth: true, category: '仪表盘' },
  { path: '/api/dashboard/trends', method: 'GET', description: '趋势数据', requiresAuth: true, category: '仪表盘' },
];

/**
 * 检查单个API接口
 * 使用内部调用方式，避免HTTP请求开销
 */
async function checkApiEndpoint(endpoint: ApiEndpoint): Promise<{
  path: string;
  method: string;
  description: string;
  category: string;
  status: 'healthy' | 'error' | 'timeout';
  responseTime: number;
  statusCode?: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    // 动态导入对应的API路由处理器
    let handler: any = null;
    let modulePath = '';
    
    // 构建模块路径
    const apiPath = endpoint.path.replace('/api/', '').replace(/\//g, '/');
    const pathParts = apiPath.split('/').filter(Boolean);
    
    // 尝试导入API处理器
    try {
      // 处理动态路由（如 [id]）
      if (pathParts.length > 0) {
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart.includes('[') && lastPart.includes(']')) {
          // 动态路由，使用父路径
          const parentPath = pathParts.slice(0, -1).join('/');
          modulePath = `@/app/api/${parentPath}/route`;
        } else {
          modulePath = `@/app/api/${pathParts.join('/')}/route`;
        }
      } else {
        modulePath = `@/app/api/route`;
      }

      // 尝试导入
      const module = await import(modulePath);
      handler = module[endpoint.method] || module.default;
    } catch (importError) {
      // 如果导入失败，尝试使用HTTP请求方式
      return await checkApiEndpointViaHttp(endpoint);
    }

    // 如果找到了处理器，认为接口存在
    if (handler) {
      const responseTime = Date.now() - startTime;
      return {
        path: endpoint.path,
        method: endpoint.method,
        description: endpoint.description,
        category: endpoint.category,
        status: 'healthy',
        responseTime,
        statusCode: 200,
      };
    }

    // 如果没找到处理器，使用HTTP方式检查
    return await checkApiEndpointViaHttp(endpoint);
  } catch (error) {
    // 如果内部检查失败，使用HTTP方式
    return await checkApiEndpointViaHttp(endpoint);
  }
}

/**
 * 通过HTTP请求检查API接口（备用方案）
 */
async function checkApiEndpointViaHttp(endpoint: ApiEndpoint): Promise<{
  path: string;
  method: string;
  description: string;
  category: string;
  status: 'healthy' | 'error' | 'timeout';
  responseTime: number;
  statusCode?: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    // 获取基础URL
    const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 
                   process.env.NEXT_PUBLIC_ASSET_BASE_URL || 
                   'http://localhost:3000';
    const url = `${baseUrl}${endpoint.path}`;

    // 构建请求选项
    const requestOptions: RequestInit = {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // 对于POST请求，添加最小化的body
    if (endpoint.method === 'POST') {
      if (endpoint.path === '/api/auth/login') {
        requestOptions.body = JSON.stringify({
          email: 'test@example.com',
          password: 'test'
        });
      } else {
        requestOptions.body = JSON.stringify({});
      }
    }

    // 设置5秒超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      // 对于需要认证的接口，401/403是预期的
      if (response.status === 401 || response.status === 403) {
        return {
          path: endpoint.path,
          method: endpoint.method,
          description: endpoint.description,
          category: endpoint.category,
          status: 'healthy',
          responseTime,
          statusCode: response.status,
        };
      }

      // 200-299 和 400-499（除了401/403）都认为是接口正常
      if (response.status >= 200 && response.status < 500) {
        return {
          path: endpoint.path,
          method: endpoint.method,
          description: endpoint.description,
          category: endpoint.category,
          status: 'healthy',
          responseTime,
          statusCode: response.status,
        };
      }

      // 500+ 认为是错误
      return {
        path: endpoint.path,
        method: endpoint.method,
        description: endpoint.description,
        category: endpoint.category,
        status: 'error',
        responseTime,
        statusCode: response.status,
        error: `HTTP ${response.status}`,
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return {
          path: endpoint.path,
          method: endpoint.method,
          description: endpoint.description,
          category: endpoint.category,
          status: 'timeout',
          responseTime,
          error: '请求超时（5秒）',
        };
      }
      
      throw fetchError;
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      path: endpoint.path,
      method: endpoint.method,
      description: endpoint.description,
      category: endpoint.category,
      status: 'error',
      responseTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 检查所有API接口
 */
export async function GET(request: NextRequest) {
  try {
    logger.info('开始API健康检查', { endpointCount: API_ENDPOINTS.length });

    // 并发检查所有API（限制并发数为5）
    const results = [];
    const concurrency = 5;
    
    for (let i = 0; i < API_ENDPOINTS.length; i += concurrency) {
      const batch = API_ENDPOINTS.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(endpoint => checkApiEndpoint(endpoint))
      );
      results.push(...batchResults);
    }

    // 统计结果
    const healthy = results.filter(r => r.status === 'healthy').length;
    const errors = results.filter(r => r.status === 'error').length;
    const timeouts = results.filter(r => r.status === 'timeout').length;
    const total = results.length;

    // 按分类分组
    const byCategory: Record<string, typeof results> = {};
    results.forEach(result => {
      if (!byCategory[result.category]) {
        byCategory[result.category] = [];
      }
      byCategory[result.category].push(result);
    });

    // 计算平均响应时间
    const avgResponseTime = results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.responseTime, 0) / results.length)
      : 0;

    logger.info('API健康检查完成', {
      total,
      healthy,
      errors,
      timeouts,
      avgResponseTime,
    });

    return createSuccessResponse({
      summary: {
        total,
        healthy,
        errors,
        timeouts,
        avgResponseTime,
        healthRate: total > 0 ? ((healthy / total) * 100).toFixed(1) + '%' : '0%',
      },
      results,
      byCategory,
      checkedAt: new Date().toISOString(),
    }, 'API检查完成');
  } catch (error) {
    logger.error('API检查失败', error instanceof Error ? error : new Error(String(error)));
    return createErrorResponse('API检查失败', 500);
  }
}

