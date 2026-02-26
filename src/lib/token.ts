/**
 * Token认证处理模块 (Node.js环境版本)
 * 
 * 本模块提供JWT Token的生成、验证、刷新等功能，适用于API路由和服务器组件等
 * 运行在完整Node.js环境中的代码。此模块使用jsonwebtoken库处理JWT操作。
 * 
 * 对于在Edge Runtime中运行的中间件，请使用token-edge.ts模块。
 * 
 * @module token
 */
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { UserRole, TokenPayload } from '@/types/auth';

// 严格要求JWT密钥来自环境变量，禁止默认回退值
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('缺少必要环境变量: JWT_SECRET。请在运行环境中配置后再启动应用。');
}

// Token配置常量
const TOKEN_EXPIRES_IN = '30d';               // Token有效期（30天，持久登录）
const TOKEN_REFRESH_THRESHOLD = 7 * 24 * 60 * 60; // 刷新阈值（7天，单位：秒）
const TOKEN_COOKIE_NAME = 'auth_token';      // Cookie名称
const TOKEN_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30天（秒）

// 角色层级定义（从高到低）
const roleHierarchy: Record<string, number> = {
  'super-admin': 4, // 超级管理员
  'admin': 3,       // 管理员
  'manager': 2,     // 经理
  'user': 1         // 普通用户
};

/**
 * 用户信息接口
 * @deprecated 请使用 @/types/auth 中的 TokenPayload 类型
 */
export interface UserPayload {
  id: number;
  email: string;
  name: string;
  role: string;
  avatar_url?: string;
  session_id?: string;
}

function createSessionId(): string {
  try {
    return randomUUID();
  } catch {
    return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

/**
 * 生成JWT Token
 * 
 * 根据用户信息创建一个新的JWT Token，包含用户ID、邮箱、姓名、角色等信息
 * 
 * @param user - 用户信息对象
 * @returns 生成的JWT Token字符串
 * 
 * @example
 * ```typescript
 * const token = generateToken({
 *   id: 123,
 *   email: 'user@example.com',
 *   name: '张三',
 *   role: 'admin'
 * });
 * ```
 */
export function generateToken(user: UserPayload): string {
  const sessionId = user.session_id || createSessionId();
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar_url: user.avatar_url,
      session_id: sessionId
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES_IN }
  );
}

/**
 * 验证JWT Token
 * 
 * 检查Token是否有效，并返回解析后的用户信息
 * 
 * @param token - JWT Token字符串
 * @returns 解析后的用户信息，如果Token无效则返回null
 * 
 * @example
 * ```typescript
 * const userData = verifyToken(token);
 * if (userData) {
 *   console.log(`用户验证成功: ${userData.name}`);
 * }
 * ```
 */
export function verifyToken(token: string): UserPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    return decoded;
  } catch (error) {
    console.error('Token验证失败:', error);
    return null;
  }
}

/**
 * 从请求中获取Token
 * 
 * 按以下顺序尝试获取Token:
 * 1. 从Cookie中获取
 * 2. 从Authorization头中获取（Bearer格式）
 * 
 * @param request - Next.js请求对象
 * @returns Token字符串，如果未找到则返回null
 */
export function getTokenFromRequest(request: NextRequest): string | null {
  // 从Cookie中获取Token
  const authToken = request.cookies.get(TOKEN_COOKIE_NAME);
  if (authToken?.value) {
    return authToken.value;
  }
  
  // 从Authorization头中获取Token
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
}

/**
 * 检查Token是否需要刷新
 * 
 * 如果Token的剩余有效期小于设定的阈值，则需要刷新
 * 
 * @param token - JWT Token字符串
 * @returns 是否需要刷新Token
 */
export function shouldRefreshToken(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as { exp: number };
    const currentTime = Math.floor(Date.now() / 1000);
    // 如果Token过期时间小于阈值，需要刷新
    return decoded.exp - currentTime < TOKEN_REFRESH_THRESHOLD;
  } catch (error) {
    return false;
  }
}

/**
 * 刷新用户Token
 * 
 * 根据现有用户信息生成一个新的Token
 * 
 * @param user - 用户信息对象
 * @returns 新生成的JWT Token
 */
export function refreshToken(user: UserPayload): string {
  return generateToken(user);
}

/**
 * 在响应中设置Token Cookie
 * 
 * @param response - Next.js响应对象
 * @param token - JWT Token字符串
 * @returns 更新后的响应对象
 */
export function setTokenCookie(response: NextResponse, token: string): NextResponse {
  // 生产环境默认启用secure，兼容企业微信WebView对第三方上下文cookie的限制
  const shouldSecure =
    process.env.FORCE_SECURE_COOKIE === 'true' ||
    (process.env.FORCE_SECURE_COOKIE !== 'false' && process.env.NODE_ENV === 'production');
  const sameSite = shouldSecure ? 'none' : 'lax';
  const cookieDomain = process.env.AUTH_COOKIE_DOMAIN?.trim();
  
  response.cookies.set({
    name: TOKEN_COOKIE_NAME,
    value: token,
    httpOnly: true,                           // 仅服务器可访问Cookie
    secure: shouldSecure,
    sameSite,
    maxAge: TOKEN_COOKIE_MAX_AGE,
    expires: new Date(Date.now() + TOKEN_COOKIE_MAX_AGE * 1000),
    path: '/',                                // 所有路径可访问
    ...(cookieDomain ? { domain: cookieDomain } : {})
  });
  
  return response;
}

/**
 * 清除Token Cookie
 * 
 * 用于用户登出或Token失效时
 * 
 * @param response - Next.js响应对象
 * @returns 更新后的响应对象
 */
export function clearTokenCookie(response: NextResponse): NextResponse {
  response.cookies.delete(TOKEN_COOKIE_NAME);
  return response;
}

/**
 * 从Cookie存储中获取当前Token
 * 
 * 用于服务器组件中获取用户Token
 * 
 * @returns Token字符串，如果未找到则返回null
 */
export async function getTokenFromCookieStore(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_COOKIE_NAME);
    return token?.value || null;
  } catch (error) {
    console.error('获取Cookie中的Token失败:', error);
    return null;
  }
}

/**
 * 检查用户是否有权限访问特定资源
 * 
 * 基于角色层级判断权限，高级角色自动拥有低级角色的所有权限
 * 
 * @param userRole - 用户角色
 * @param requiredRole - 所需角色或角色数组（满足其中任一角色即可）
 * @returns 是否有权限
 * 
 * @example
 * ```typescript
 * // 检查是否有管理员权限
 * const canAccess = hasPermission(user.role, 'admin');
 * 
 * // 检查是否有多个角色中的任一权限
 * const canAccessMulti = hasPermission(user.role, ['admin', 'manager']);
 * ```
 */
export function hasPermission(userRole: string, requiredRole: string | string[]): boolean {
  const userRoleLevel = roleHierarchy[userRole] || 0;
  
  if (Array.isArray(requiredRole)) {
    return requiredRole.some(role => {
      const requiredLevel = roleHierarchy[role] || 999; // 未知角色设置高级别
      return userRoleLevel >= requiredLevel;
    });
  } else {
    const requiredLevel = roleHierarchy[requiredRole] || 999;
    return userRoleLevel >= requiredLevel;
  }
} 