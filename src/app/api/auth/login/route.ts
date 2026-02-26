import { NextResponse } from 'next/server';
import { authenticateUser } from '../../../../lib/database-netlify';
import { generateToken, setTokenCookie } from '../../../../lib/token';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/auth/login');

export async function POST(request: Request) {
  logger.debug('开始处理登录请求');
  try {
    const data = await request.json() as { email: string; password: string };
    const { email, password } = data;
    logger.debug('收到登录请求', { email, passwordProvided: !!password });

    // 验证必填字段
    if (!email || !password) {
      logger.warn('登录失败: 缺少必填字段');
      return createErrorResponse('请输入邮箱和密码', 400);
    }

    // 验证用户凭据
    try {
      logger.debug('开始验证用户凭据');
      const user = await authenticateUser(email, password);
      if (!user) {
        logger.warn('登录失败: 用户验证未通过', { email });
        return createErrorResponse('邮箱或密码错误，请检查输入是否正确', 401);
      }

      logger.debug('用户验证通过，准备创建JWT Token', { userId: user.id });
      
      // 创建JWT Token
      const token = generateToken({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar_url: user.avatar_url
      });
      
      // 创建响应对象
      const response = createSuccessResponse({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar_url: user.avatar_url
        }
      }, '登录成功');

      // 在响应中设置JWT Token Cookie
      logger.debug('设置JWT Token Cookie', { userId: user.id, email: user.email });
      setTokenCookie(response, token);

      logger.info('登录成功', { userId: user.id, email: user.email });
      return response;

    } catch (authError) {
      logger.error('用户验证过程出错', authError instanceof Error ? authError : new Error(String(authError)));
      const errorMessage = authError instanceof Error 
        ? authError.message 
        : String(authError || '验证过程发生错误');
      return createErrorResponse(errorMessage, 401);
    }

  } catch (error) {
    logger.error('登录请求处理失败', error instanceof Error ? error : new Error(String(error)));
    const errorMessage = error instanceof Error 
      ? error.message 
      : String(error || '登录失败，请重试');
    return createErrorResponse(errorMessage, 500);
  }
}