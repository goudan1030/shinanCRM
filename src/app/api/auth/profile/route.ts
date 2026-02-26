import { NextResponse } from 'next/server';
import { updateUserProfile, executeQuery } from '@/lib/database-netlify';
import { getTokenFromCookieStore, verifyToken, generateToken, setTokenCookie } from '@/lib/token';

export async function PUT(request: Request) {
  try {
    const token = await getTokenFromCookieStore();
    if (!token) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const userData = verifyToken(token);
    if (!userData) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const body = await request.json();
    const { name, avatar_url, email } = body as {
      name?: string;
      avatar_url?: string | null;
      email?: string;
    };

    if (!name || !name.trim()) {
      return NextResponse.json({ error: '昵称不能为空' }, { status: 400 });
    }

    const updateData: Record<string, any> = {
      name: name.trim()
    };

    if (typeof avatar_url === 'string') {
      const trimmedAvatar = avatar_url.trim();
      updateData.avatar_url = trimmedAvatar.length > 0 ? trimmedAvatar : null;
    }

    if (typeof email === 'string' && email.trim()) {
      updateData.email = email.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: '无需更新' });
    }

    await updateUserProfile(Number(userData.id), updateData);

    const [rows] = await executeQuery(
      'SELECT id, email, name, role, avatar_url FROM admin_users WHERE id = ? LIMIT 1',
      [userData.id]
    );

    if (!rows || (rows as any[]).length === 0) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const updatedUser = (rows as any[])[0];

    const response = NextResponse.json({
      message: '更新成功',
      user: updatedUser
    });

    const newToken = generateToken({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      avatar_url: updatedUser.avatar_url
    });

    setTokenCookie(response, newToken);

    return response;
  } catch (error) {
    console.error('更新个人资料失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新失败' },
      { status: 500 }
    );
  }
}
