import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import { NextRequest } from 'next/server';

/**
 * 示例：演示API错误处理和成功响应
 */
export async function GET(request: NextRequest) {
  try {
    // 模拟一些业务逻辑
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    // 演示不同的响应场景
    switch (action) {
      case 'success':
        return createSuccessResponse({
          message: '这是一个成功的响应',
          timestamp: new Date().toISOString()
        }, '操作成功完成');
        
      case 'error':
        return createErrorResponse('这是一个示例错误', 400);
        
      case 'validation':
        return createErrorResponse('参数验证失败：缺少必要的参数', 422);
        
      case 'not_found':
        return createErrorResponse('请求的资源不存在', 404);
        
      default:
        return createSuccessResponse({
          availableActions: ['success', 'error', 'validation', 'not_found'],
          description: '请通过 ?action=<action> 参数来测试不同的响应类型',
          currentAction: action || 'none'
        }, '错误处理示例API');
    }
  } catch (error) {
    console.error('示例API错误:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
} 