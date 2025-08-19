import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/token';
import { executeQuery } from '@/lib/database-netlify';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // 验证用户权限
    const authResult = await verifyToken(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: '未授权访问' },
        { status: 401 }
      );
    }

    const user = authResult.user;

    // 解析请求体
    const body = await request.json();
    const { device_token, platform, app_version } = body;

    // 验证必填字段
    if (!device_token || !platform) {
      return NextResponse.json(
        { success: false, message: '设备令牌和平台信息不能为空' },
        { status: 400 }
      );
    }

    // 检查是否已存在该设备的令牌记录
    const checkQuery = `
      SELECT id FROM device_tokens 
      WHERE user_id = ? AND device_token = ?
    `;
    
    const existingToken = await executeQuery(checkQuery, [user.id, device_token]);

    if (existingToken.length > 0) {
      // 更新现有记录
      const updateQuery = `
        UPDATE device_tokens 
        SET platform = ?, app_version = ?, updated_at = NOW()
        WHERE user_id = ? AND device_token = ?
      `;
      
      await executeQuery(updateQuery, [platform, app_version, user.id, device_token]);
    } else {
      // 插入新记录
      const insertQuery = `
        INSERT INTO device_tokens (user_id, device_token, platform, app_version, created_at, updated_at)
        VALUES (?, ?, ?, ?, NOW(), NOW())
      `;
      
      await executeQuery(insertQuery, [user.id, device_token, platform, app_version]);
    }

    const result = {
      success: true,
      message: '设备令牌注册成功',
      data: {
        user_id: user.id,
        device_token: device_token.substring(0, 10) + '...', // 部分隐藏令牌
        platform,
        app_version,
        registered_at: new Date().toISOString()
      }
    };

    logger.info('设备令牌注册成功', {
      user_id: user.id,
      platform,
      app_version
    });

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    logger.error('设备令牌注册失败', { error: error instanceof Error ? error.message : String(error) });
    
    return NextResponse.json(
      { success: false, message: '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
}
