import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';

/**
 * 诊断接口：查看当前应用连接到的数据库中 banners 表 image_url/link_url 的列类型
 * 用于确认 ALTER TABLE 是否在「应用实际使用的库」上生效
 * 调用：GET /api/platform/banner/schema
 */
export async function GET() {
  try {
    const [rows] = await executeQuery(
      `SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'banners' 
       AND COLUMN_NAME IN ('image_url','link_url')
       ORDER BY COLUMN_NAME`
    );
    const columns = Array.isArray(rows) ? rows : [];
    return NextResponse.json({
      ok: true,
      message: '当前应用连接的库中 banners 表列类型如下（若 image_url 仍为 varchar 且 length=255，说明 ALTER 未在该库生效）',
      columns,
    });
  } catch (e) {
    console.error('banner schema check failed', e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
