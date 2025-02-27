import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

// 获取企业微信配置
export async function GET() {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM wecom_config LIMIT 1'
    );

    return NextResponse.json(rows[0] || {});
  } catch (error) {
    console.error('获取企业微信配置失败:', error);
    return NextResponse.json(
      { error: '获取企业微信配置失败' },
      { status: 500 }
    );
  }
}

// 更新企业微信配置
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { corp_id, agent_id, secret } = data;

    if (!corp_id || !agent_id || !secret) {
      return NextResponse.json(
        { error: '请提供完整的配置信息' },
        { status: 400 }
      );
    }

    // 使用 REPLACE INTO 确保只有一条记录
    await pool.execute(
      'REPLACE INTO wecom_config (id, corp_id, agent_id, secret) VALUES (1, ?, ?, ?)',
      [corp_id, agent_id, secret]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新企业微信配置失败:', error);
    return NextResponse.json(
      { error: '更新企业微信配置失败' },
      { status: 500 }
    );
  }
}