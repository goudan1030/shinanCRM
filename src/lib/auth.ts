import { cookies } from 'next/headers';
import { UserPayload, verifyToken, getTokenFromCookieStore } from './token';
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { executeQuery } from '@/lib/database-netlify';
import { compare } from 'bcrypt';

export interface User {
  id: number;
  username?: string;
  name?: string;
  email?: string;
  role: string;
  avatar_url?: string;
}

export interface Session {
  user?: User;
}

/**
 * 获取当前用户会话信息
 * @returns 会话信息或null
 */
export async function getSession(): Promise<Session | null> {
  try {
    // 获取Token
    const token = await getTokenFromCookieStore();

    if (!token) {
      return null;
    }

    // 验证Token
    const userData = verifyToken(token);
    
    if (!userData) {
      return null;
    }
      
      return {
        user: {
        id: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          avatar_url: userData.avatar_url
        }
      };
  } catch (error) {
    console.error('获取用户会话失败:', error);
    return null;
  }
}

/**
 * 检查用户是否已认证
 * @returns 是否已认证
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null && session.user !== undefined;
}

/**
 * 检查用户是否有特定权限
 * @param requiredRole 所需角色
 * @returns 是否有权限
 */
export async function hasRole(requiredRole: string | string[]): Promise<boolean> {
  const session = await getSession();
  
  if (!session?.user) {
    return false;
  }
  
  const userRole = session.user.role;
  
  // 角色层级定义
  const roleHierarchy: Record<string, number> = {
    'super-admin': 4,
    'admin': 3,
    'manager': 2,
    'user': 1
  };
  
  const userRoleLevel = roleHierarchy[userRole] || 0;
  
  if (Array.isArray(requiredRole)) {
    return requiredRole.some(role => {
      const requiredLevel = roleHierarchy[role] || 999;
      return userRoleLevel >= requiredLevel;
    });
  } else {
    const requiredLevel = roleHierarchy[requiredRole] || 999;
    return userRoleLevel >= requiredLevel;
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24小时
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: '用户名', type: 'text' },
        password: { label: '密码', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          // 查询用户
          const [rows] = await executeQuery(
            'SELECT * FROM admin_users WHERE username = ?',
            [credentials.username]
          );

          const users = rows as any[];
          if (users.length === 0) {
            return null;
          }

          const user = users[0];
          
          // 验证密码
          const isValidPassword = await compare(credentials.password, user.password);
          if (!isValidPassword) {
            return null;
          }

          // 返回用户信息（不包含密码）
          return {
            id: user.id,
            name: user.username,
            email: user.email || '',
            role: user.role,
          };
        } catch (error) {
          console.error('授权失败:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
};

// 检查用户是否拥有指定权限
export async function hasPermission(userId: string | number, permission: string): Promise<boolean> {
  try {
    // 查询用户角色
    const [rows] = await executeQuery(
      'SELECT role FROM admin_users WHERE id = ?',
      [userId]
    );

    if ((rows as any[]).length === 0) {
      return false;
    }

    const user = (rows as any[])[0];
    const role = user.role;

    // 超级管理员拥有所有权限
    if (role === 'super_admin') {
      return true;
    }

    // 查询角色权限
    const [permRows] = await executeQuery(
      'SELECT permissions FROM admin_roles WHERE role_name = ?',
      [role]
    );

    if ((permRows as any[]).length === 0) {
      return false;
    }

    // 解析权限列表
    const rolePerms = (permRows as any[])[0].permissions;
    const permissions = rolePerms ? JSON.parse(rolePerms) : [];

    return permissions.includes(permission);
  } catch (error) {
    console.error('检查权限失败:', error);
    return false;
  }
}