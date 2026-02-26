import { NextRequest, NextResponse } from 'next/server';
import { getWecomConfig, getWecomAccessToken } from '@/lib/wecom-api';
import { executeQuery } from '@/lib/database-netlify';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/wecom/document/update');

/**
 * 更新企业微信文档内容
 * POST /api/wecom/document/update
 * 
 * 请求体：
 * {
 *   "doc_id": "企业微信文档ID",
 *   "content": "新的文档内容（Markdown格式）",
 *   "append": false // 是否追加内容，false表示替换，true表示追加
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { doc_id, content, append = false } = body;

    if (!doc_id) {
      return createErrorResponse('文档ID不能为空', 400);
    }

    if (!content) {
      return createErrorResponse('文档内容不能为空', 400);
    }

    logger.info('开始更新企业微信文档', { doc_id, append });

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

    // 如果需要追加内容，先获取现有内容
    let finalContent = content;
    if (append) {
      try {
        // 获取文档当前内容
        const getDocUrl = `https://qyapi.weixin.qq.com/cgi-bin/doc/get?access_token=${accessToken}&docid=${doc_id}`;
        const getResponse = await fetch(getDocUrl);
        
        if (getResponse.ok) {
          const docData = await getResponse.json();
          if (docData.errcode === 0 && docData.content) {
            // 追加新内容到现有内容
            finalContent = docData.content + '\n\n' + content;
            logger.debug('获取现有内容并追加', { originalLength: docData.content.length });
          }
        }
      } catch (error) {
        logger.warn('获取现有内容失败，将直接替换', { error: error instanceof Error ? error.message : String(error) });
      }
    }

    // 调用企业微信API更新文档
    // 注意：根据企业微信官方文档，可能没有直接的文档更新API
    // 我们尝试多种可能的API端点
    
    // 方式1：尝试使用 /cgi-bin/doc/update 接口
    let updateDocUrl = `https://qyapi.weixin.qq.com/cgi-bin/doc/update?access_token=${accessToken}`;
    
    const updateRequest = {
      docid: doc_id,
      content: finalContent
    };

    logger.debug('调用企业微信更新文档API', { url: updateDocUrl, doc_id, contentLength: finalContent.length });

    let response = await fetch(updateDocUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateRequest)
    });

    let result;
    const responseText = await response.text();
    
    // 如果返回404，说明API端点不存在
    if (response.status === 404) {
      logger.error('企业微信文档更新API返回404', { 
        doc_id, 
        attemptedUrl: updateDocUrl,
        responseStatus: response.status,
        responseText: responseText.substring(0, 500)
      });
      
      // 尝试解析响应，看是否有更多错误信息
      try {
        const errorData = JSON.parse(responseText);
        logger.error('企业微信API错误详情', errorData);
        
        return createErrorResponse(
          `企业微信文档更新API不存在 (404)。` +
          `错误信息: ${errorData.errmsg || 'API端点不存在'}。` +
          `\n\n可能的原因：` +
          `\n1. 企业微信可能不提供文档内容更新的API接口` +
          `\n2. 文档ID格式不正确: ${doc_id}` +
          `\n3. 应用可能没有文档编辑权限` +
          `\n\n建议解决方案：` +
          `\n1. 在企业微信管理后台检查应用权限，确保开启了"文档"相关权限` +
          `\n2. 确认文档ID是否正确（从文档URL中提取）` +
          `\n3. 考虑使用企业微信消息推送功能，将内容发送到企业微信，然后手动复制到文档` +
          `\n4. 或使用第三方文档服务（如WPS）的API进行文档更新`,
          404
        );
      } catch (e) {
        // 无法解析JSON，返回通用错误
        return createErrorResponse(
          `企业微信文档更新API不存在 (404)。` +
          `\n\n企业微信可能不提供直接更新文档内容的API接口。` +
          `\n\n替代方案：` +
          `\n1. 使用企业微信消息推送，将内容发送到企业微信` +
          `\n2. 在企业微信客户端中手动编辑文档` +
          `\n3. 使用第三方文档服务API`,
          404
        );
      }
    }

    if (!response.ok) {
      logger.error('企业微信API请求失败', { 
        status: response.status, 
        statusText: response.statusText,
        error: responseText,
        doc_id,
        url: updateDocUrl
      });
      
      // 尝试解析错误信息
      try {
        result = JSON.parse(responseText);
        if (result.errcode !== undefined) {
          logger.error('企业微信API返回错误', { 
            errcode: result.errcode, 
            errmsg: result.errmsg,
            doc_id 
          });
          return createErrorResponse(
            `企业微信API错误: ${result.errmsg} (错误代码: ${result.errcode})`,
            500
          );
        }
      } catch (e) {
        // 无法解析JSON，返回原始错误
      }
      
      return createErrorResponse(
        `企业微信API请求失败: ${response.status} ${response.statusText}`,
        500
      );
    }

    try {
      result = JSON.parse(responseText);
    } catch (e) {
      logger.error('解析企业微信API响应失败', { 
        error: e instanceof Error ? e.message : String(e),
        responseText: responseText.substring(0, 500) // 只记录前500字符
      });
      return createErrorResponse('企业微信API返回格式错误', 500);
    }

    logger.debug('企业微信API响应', { result, doc_id });

    if (result.errcode !== 0) {
      logger.error('更新企业微信文档失败', { 
        errcode: result.errcode, 
        errmsg: result.errmsg,
        doc_id 
      });
      
      // 根据错误代码提供更详细的错误信息
      let errorMessage = `更新文档失败: ${result.errmsg}`;
      if (result.errcode === 40014) {
        errorMessage += ' (可能是文档ID格式不正确)';
      } else if (result.errcode === 60011) {
        errorMessage += ' (可能是应用没有文档编辑权限)';
      } else if (result.errcode === 85001) {
        errorMessage += ' (可能是文档不存在或无权访问)';
      }
      
      return createErrorResponse(errorMessage, 500);
    }

    logger.info('企业微信文档更新成功', { doc_id });

    return createSuccessResponse({
      doc_id,
      updated: true
    }, '文档更新成功');

  } catch (error) {
    logger.error('更新企业微信文档失败', error instanceof Error ? error : new Error(String(error)));
    return createErrorResponse(
      error instanceof Error ? error.message : '更新文档失败',
      500
    );
  }
}

