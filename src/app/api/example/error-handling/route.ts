import { NextRequest } from 'next/server';
import { apiSuccess, withRequestInfo } from '@/lib/api-utils';
import { createLogger } from '@/lib/logger';
import { 
  createValidationError,
  createAuthenticationError,
  createNotFoundError,
  createBusinessError,
  AppError,
  ErrorType,
  ErrorSeverity
} from '@/lib/error-handler';

// 创建当前模块的日志记录器
const logger = createLogger('example-api');

/**
 * 示例API - GET方法
 * 演示不同类型的错误处理
 */
export const GET = withRequestInfo(async (req: NextRequest, requestInfo: Record<string, any>) => {
  try {
    // 记录请求
    logger.info('收到错误处理示例API请求', { ...requestInfo });
    
    // 从URL参数中获取错误类型
    const { searchParams } = new URL(req.url);
    const errorType = searchParams.get('error');
    
    // 根据请求参数模拟不同类型的错误
    if (errorType === 'validation') {
      logger.debug('模拟验证错误');
      throw createValidationError('输入参数验证失败', {
        fields: {
          name: '名称不能为空',
          email: '邮箱格式不正确'
        }
      });
    }
    
    if (errorType === 'auth') {
      logger.debug('模拟认证错误');
      throw createAuthenticationError('用户未登录或会话已过期');
    }
    
    if (errorType === 'notfound') {
      logger.debug('模拟资源不存在错误');
      throw createNotFoundError('用户');
    }
    
    if (errorType === 'business') {
      logger.debug('模拟业务逻辑错误');
      throw createBusinessError('该手机号已被注册', 'PHONE_EXISTS');
    }
    
    if (errorType === 'database') {
      logger.debug('模拟数据库错误');
      // 模拟一个原始错误
      const originalError = new Error('数据库连接失败: Connection refused');
      originalError.name = 'SequelizeConnectionError';
      
      throw new AppError({
        message: '数据库操作失败',
        type: ErrorType.DATABASE,
        severity: ErrorSeverity.HIGH,
        originalError
      });
    }
    
    if (errorType === 'critical') {
      logger.debug('模拟严重错误');
      throw new AppError({
        message: '系统关键组件失败',
        type: ErrorType.UNKNOWN,
        severity: ErrorSeverity.CRITICAL
      });
    }
    
    // 如果没有错误参数，返回成功响应
    logger.info('请求成功处理，返回正常响应');
    return apiSuccess({ 
      message: '错误处理演示API',
      usage: '添加?error=类型参数来测试不同类型的错误',
      errorTypes: [
        'validation', 'auth', 'notfound', 'business', 
        'database', 'critical'
      ] 
    }, '请求成功');
    
  } catch (error) {
    // 异常会被withRequestInfo中间件捕获并处理
    throw error;
  }
}); 