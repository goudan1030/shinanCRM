import { NextRequest, NextResponse } from 'next/server';
import { getWecomConfig, getWecomAccessToken } from '@/lib/wecom-api';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/wecom/document/get');

/**
 * 获取企业微信文档信息
 * GET /api/wecom/document/get?doc_id=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const doc_id = searchParams.get('doc_id');

    if (!doc_id) {
      return createErrorResponse('文档ID不能为空', 400);
    }

    logger.info('获取企业微信文档信息', { doc_id });

    // 获取企业微信配置
    const config = await getWecomConfig();
    if (!config) {
      return createErrorResponse('企业微信配置不存在', 500);
    }

    // 获取Access Token
    const accessToken = await getWecomAccessToken(config);
    if (!accessToken) {
      return createErrorResponse('无法获取企业微信Access Token', 500);
    }

    // 调用企业微信API获取文档信息
    const getDocUrl = `https://qyapi.weixin.qq.com/cgi-bin/doc/get?access_token=${accessToken}&docid=${doc_id}`;
    
    logger.debug('调用企业微信获取文档API', { url: getDocUrl });

    const response = await fetch(getDocUrl, {
      method: 'GET'
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('企业微信API请求失败', { status: response.status, error: errorText });
      return createErrorResponse(`企业微信API请求失败: ${response.status}`, 500);
    }

    const result = await response.json();
    logger.debug('企业微信API响应', result);

    if (result.errcode !== 0) {
      logger.error('获取企业微信文档失败', { errcode: result.errcode, errmsg: result.errmsg });
      return createErrorResponse(`获取文档失败: ${result.errmsg}`, 500);
    }

    return createSuccessResponse({
      doc_id: result.docid || doc_id,
      doc_name: result.doc_name,
      doc_url: result.url,
      share_url: result.share_url,
      content: result.content,
      creator: result.creator,
      create_time: result.create_time,
      update_time: result.update_time
    }, '获取成功');

  } catch (error) {
    logger.error('获取企业微信文档失败', error instanceof Error ? error : new Error(String(error)));
    return createErrorResponse(
      error instanceof Error ? error.message : '获取文档失败',
      500
    );
  }
}

