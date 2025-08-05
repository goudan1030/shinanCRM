import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';

// 获取小程序配置
export async function GET() {
  try {
    const [rows] = await executeQuery(
      'SELECT * FROM miniapp_config LIMIT 1'
    );

    return NextResponse.json(rows[0] || {});
  } catch (error) {
    console.error('获取小程序配置失败:', error);
    return NextResponse.json(
      { error: '获取小程序配置失败' },
      { status: 500 }
    );
  }
}

// 更新小程序配置
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { appid, appsecret } = data;

    if (!appid || !appsecret) {
      return NextResponse.json(
        { error: '请提供完整的配置信息' },
        { status: 400 }
      );
    }

    // 使用 REPLACE INTO 确保只有一条记录
    await executeQuery(
      'REPLACE INTO miniapp_config (id, appid, appsecret) VALUES (1, ?, ?)',
      [appid, appsecret]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新小程序配置失败:', error);
    return NextResponse.json(
      { error: '更新小程序配置失败' },
      { status: 500 }
    );
  }
}