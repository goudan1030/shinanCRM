import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromRequest } from '@/lib/token';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // 获取Token
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { success: false, message: '未授权访问' },
        { status: 401 }
      );
    }

    // 验证Token
    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Token无效' },
        { status: 401 }
      );
    }
    if (user.role < 3) { // 需要管理员权限
      return NextResponse.json(
        { success: false, message: '权限不足，需要管理员权限' },
        { status: 403 }
      );
    }

    // 检查APNs配置
    const config = {
      keyId: !!process.env.APNS_KEY_ID,
      teamId: !!process.env.APNS_TEAM_ID,
      bundleId: !!process.env.APNS_BUNDLE_ID,
      privateKey: !!process.env.APNS_PRIVATE_KEY,
      environment: !!process.env.APNS_ENVIRONMENT
    };

    const overall = config.keyId && config.teamId && config.bundleId && config.privateKey && config.environment;

    const result = {
      success: true,
      data: {
        ...config,
        overall
      }
    };

    logger.info('推送配置检查完成', {
      user_id: user.id,
      config_status: result.data
    });

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    logger.error('推送配置检查失败', { error: error instanceof Error ? error.message : String(error) });
    
    return NextResponse.json(
      { success: false, message: '配置检查失败，请稍后重试' },
      { status: 500 }
    );
  }
}
