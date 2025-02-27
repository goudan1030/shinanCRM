import { cookies } from 'next/headers';
import { createClient } from './mysql';

export interface User {
  id: number;
  username: string;
  role: string;
}

export interface Session {
  user?: User;
}

export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth_token');

    if (!token) {
      return null;
    }

    const mysql = createClient();
    
    const [users] = await mysql.query(
      'SELECT id, username, role FROM admin_users WHERE token = ? AND token_expires > NOW()',
      [token.value]
    );

    await mysql.end();

    if (!users || users.length === 0) {
      return null;
    }

    return {
      user: users[0] as User
    };
  } catch (error) {
    console.error('获取用户会话失败:', error);
    return null;
  }
}