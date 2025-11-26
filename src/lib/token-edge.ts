/**
 * Token处理工具模块 - Edge Runtime兼容版本
 * 为中间件提供JWT处理功能
 */
import { jwtVerify, SignJWT } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

// JWT密钥，生产环境中应从环境变量获取
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-should-be-long-and-secure';
// 转换为Uint8Array类型，jose库需要
const JWT_SECRET_BYTES = new TextEncoder().encode(JWT_SECRET);
// Token过期时间
const TOKEN_EXPIRES_IN = '7d'; // 7天过期
// 刷新Token的时间阈值（小于这个时间时自动刷新Token）
const TOKEN_REFRESH_THRESHOLD = 24 * 60 * 60; // 24小时（秒）

// 角色层级定义
const roleHierarchy: Record<string, number> = {
  'super-admin': 4,
  'admin': 3,
  'manager': 2,
  'user': 1
};

// 用户信息接口
export interface UserPayload {
  id: number;
  email: string;
  name: string;
  role: string;
  avatar_url?: string;
}

/**
 * 验证JWT Token - Edge兼容版
 * @param token JWT Token
 * @returns 解析后的用户信息或null
 */
export async function verifyToken(token: string): Promise<UserPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_BYTES);
    return payload as unknown as UserPayload;
  } catch (error) {
    console.error('Token验证失败:', error);
    return null;
  }
}

/**
 * 从请求中获取Token
 * @param request Next.js请求对象
 * @returns Token字符串或null
 */
export function getTokenFromRequest(request: NextRequest): string | null {
  // 从Cookie中获取Token
  const authToken = request.cookies.get('auth_token');
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
 * 检查Token是否需要刷新 - Edge兼容版
 * @param token JWT Token
 * @returns 是否需要刷新
 */
export async function shouldRefreshToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_BYTES);
    if (!payload.exp) return false;
    
    const expirationTime = payload.exp as number;
    const currentTime = Math.floor(Date.now() / 1000);
    // 如果Token过期时间小于阈值，需要刷新
    return expirationTime - currentTime < TOKEN_REFRESH_THRESHOLD;
  } catch (error) {
    return false;
  }
}

/**
 * 刷新用户Token - Edge兼容版
 * @param user 用户信息
 * @returns 新的Token
 */
export async function refreshToken(user: UserPayload): Promise<string> {
  // 使用jose创建JWT
  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatar_url: user.avatar_url
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRES_IN)
    .sign(JWT_SECRET_BYTES);
  
  return token;
}

/**
 * 在响应中设置Token Cookie
 * @param response Next.js响应对象
 * @param token JWT Token
 * @returns 更新后的响应对象
 */
export function setTokenCookie(response: NextResponse, token: string): NextResponse {
  // 检测是否在HTTPS环境中
  const isHttps = process.env.NEXT_PUBLIC_HTTPS === 'true' || 
                  (typeof process !== 'undefined' && process.env.FORCE_SECURE_COOKIE === 'true');
  
  response.cookies.set({
    name: 'auth_token',
    value: token,
    httpOnly: true,
    secure: isHttps, // 根据实际协议设置
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7天（秒）
    path: '/'
    // 不设置domain，让浏览器自动处理
  });
  return response;
}

/**
 * 清除Token Cookie
 * @param response Next.js响应对象
 * @returns 更新后的响应对象
 */
export function clearTokenCookie(response: NextResponse): NextResponse {
  response.cookies.delete('auth_token');
  return response;
}

/**
 * 检查用户是否有权限访问特定资源
 * @param userRole 用户角色
 * @param requiredRole 所需角色
 * @returns 是否有权限
 */
export function hasPermission(userRole: string, requiredRole: string | string[]): boolean {
  const userRoleLevel = roleHierarchy[userRole] || 0;
  
  if (Array.isArray(requiredRole)) {
    return requiredRole.some(role => {
      const requiredLevel = roleHierarchy[role] || 999; // 如果角色不存在，设置一个很高的级别
      return userRoleLevel >= requiredLevel;
    });
  } else {
    const requiredLevel = roleHierarchy[requiredRole] || 999;
    return userRoleLevel >= requiredLevel;
  }
} 