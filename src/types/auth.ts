/**
 * 认证系统类型定义
 * 定义认证相关的接口、类型和枚举
 */

/**
 * 用户角色枚举
 */
export enum UserRole {
  SUPER_ADMIN = 'super-admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user'
}

/**
 * 用户角色等级
 * 用于权限判断，数字越大权限越高
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 4,
  [UserRole.ADMIN]: 3,
  [UserRole.MANAGER]: 2,
  [UserRole.USER]: 1
};

/**
 * 用户基本信息接口
 */
export interface User {
  id: string | number;
  email: string;
  name?: string;
  role: UserRole | string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * JWT Token负载接口
 */
export interface TokenPayload {
  id: string | number;
  email: string;
  name: string;
  role: UserRole | string;
  avatar_url?: string;
  exp?: number;  // Token过期时间
  iat?: number;  // Token创建时间
}

/**
 * 用户会话接口
 */
export interface Session {
  user: User;
  access_token: string;
  refresh_token?: string;
  expires_at: number;
}

/**
 * 认证状态接口
 */
export interface AuthState {
  session: Session | null;
  isLoading: boolean;
  error: Error | null;
  operatorId: string | null;
}

/**
 * 登录请求接口
 */
export interface LoginRequest {
  email: string;
  password: string;
  remember?: boolean;
}

/**
 * 登录响应接口
 */
export interface LoginResponse {
  user: User;
  token: string;
  refreshToken?: string;
  expiresAt: number;
}