import { NextRequest, NextResponse } from 'next/server';
import { getWecomConfig, getWecomAccessToken, sendWecomMessage } from '@/lib/wecom-api';
import { executeQuery } from '@/lib/database-netlify';

/**
 * 企业微信配置检查API
 * 
 * 用于检查企业微信配置是否正确
 * 包括数据库配置、API连接、消息发送测试等
 */

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 开始检查企业微信配置...');
    
    const checkResults = {
      timestamp: new Date().toISOString(),
      database: {
        status: 'checking',
        message: '',
        error: null
      },
      wecomConfig: {
        status: 'checking',
        message: '',
        config: null,
        error: null
      },
      accessToken: {
        status: 'checking',
        message: '',
        token: null,
        error: null
      },
      messageTest: {
        status: 'checking',
        message: '',
        success: false,
        error: null
      },
      overall: {
        status: 'checking',
        message: '',
        allPassed: false
      }
    };

    // 1. 检查数据库连接
    try {
      console.log('1. 检查数据库连接...');
      const [rows] = await executeQuery('SELECT 1 as test');
      checkResults.database.status = 'success';
      checkResults.database.message = '数据库连接正常';
      console.log('✓ 数据库连接正常');
    } catch (error) {
      checkResults.database.status = 'error';
      checkResults.database.message = '数据库连接失败';
      checkResults.database.error = error.message;
      console.error('✗ 数据库连接失败:', error);
    }

    // 2. 检查企业微信配置表
    try {
      console.log('2. 检查企业微信配置...');
      const [configRows] = await executeQuery('SELECT * FROM wecom_config LIMIT 1');
      const configs = configRows as any[];
      
      if (configs.length === 0) {
        checkResults.wecomConfig.status = 'error';
        checkResults.wecomConfig.message = '未找到企业微信配置';
        console.log('✗ 未找到企业微信配置');
      } else {
        const config = configs[0];
        checkResults.wecomConfig.status = 'success';
        checkResults.wecomConfig.message = '企业微信配置正常';
        checkResults.wecomConfig.config = {
          corp_id: config.corp_id,
          agent_id: config.agent_id,
          secret: config.secret ? '***' : null,
          member_notification_enabled: config.member_notification_enabled,
          notification_recipients: config.notification_recipients
        };
        console.log('✓ 企业微信配置正常');
      }
    } catch (error) {
      checkResults.wecomConfig.status = 'error';
      checkResults.wecomConfig.message = '企业微信配置检查失败';
      checkResults.wecomConfig.error = error.message;
      console.error('✗ 企业微信配置检查失败:', error);
    }

    // 3. 检查Access Token
    try {
      console.log('3. 检查Access Token...');
      const config = await getWecomConfig();
      if (!config) {
        checkResults.accessToken.status = 'error';
        checkResults.accessToken.message = '无法获取企业微信配置';
        console.log('✗ 无法获取企业微信配置');
      } else {
        const accessToken = await getWecomAccessToken(config);
        if (!accessToken) {
          checkResults.accessToken.status = 'error';
          checkResults.accessToken.message = '无法获取Access Token';
          console.log('✗ 无法获取Access Token');
        } else {
          checkResults.accessToken.status = 'success';
          checkResults.accessToken.message = 'Access Token获取成功';
          checkResults.accessToken.token = accessToken.substring(0, 10) + '...';
          console.log('✓ Access Token获取成功');
        }
      }
    } catch (error) {
      checkResults.accessToken.status = 'error';
      checkResults.accessToken.message = 'Access Token检查失败';
      checkResults.accessToken.error = error.message;
      console.error('✗ Access Token检查失败:', error);
    }

    // 4. 测试消息发送
    try {
      console.log('4. 测试消息发送...');
      const config = await getWecomConfig();
      if (config) {
        const accessToken = await getWecomAccessToken(config);
        if (accessToken) {
          const testMessage = {
            touser: '@all', // 发送给所有人（测试用）
            msgtype: 'text' as const,
            agentid: config.agent_id,
            text: {
              content: '🔧 企业微信配置测试消息\n\n如果您收到此消息，说明企业微信配置正常。\n\n发送时间：' + new Date().toLocaleString('zh-CN')
            }
          };
          
          const success = await sendWecomMessage(accessToken, testMessage);
          if (success) {
            checkResults.messageTest.status = 'success';
            checkResults.messageTest.message = '消息发送测试成功';
            checkResults.messageTest.success = true;
            console.log('✓ 消息发送测试成功');
          } else {
            checkResults.messageTest.status = 'error';
            checkResults.messageTest.message = '消息发送测试失败';
            console.log('✗ 消息发送测试失败');
          }
        } else {
          checkResults.messageTest.status = 'error';
          checkResults.messageTest.message = '无法获取Access Token进行测试';
          console.log('✗ 无法获取Access Token进行测试');
        }
      } else {
        checkResults.messageTest.status = 'error';
        checkResults.messageTest.message = '无法获取企业微信配置进行测试';
        console.log('✗ 无法获取企业微信配置进行测试');
      }
    } catch (error) {
      checkResults.messageTest.status = 'error';
      checkResults.messageTest.message = '消息发送测试失败';
      checkResults.messageTest.error = error.message;
      console.error('✗ 消息发送测试失败:', error);
    }

    // 5. 总体评估
    const allPassed = 
      checkResults.database.status === 'success' &&
      checkResults.wecomConfig.status === 'success' &&
      checkResults.accessToken.status === 'success' &&
      checkResults.messageTest.status === 'success';

    checkResults.overall.status = allPassed ? 'success' : 'error';
    checkResults.overall.message = allPassed 
      ? '所有检查项目通过，企业微信配置正常' 
      : '部分检查项目失败，请查看详细信息';
    checkResults.overall.allPassed = allPassed;

    console.log(`总体评估: ${allPassed ? '✓ 通过' : '✗ 失败'}`);

    return NextResponse.json(checkResults);

  } catch (error) {
    console.error('配置检查失败:', error);
    return NextResponse.json({
      error: '配置检查失败',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testUser = '@all', testMessage = '测试消息' } = body;

    console.log('🧪 开始发送测试消息...');

    const config = await getWecomConfig();
    if (!config) {
      return NextResponse.json({
        success: false,
        error: '无法获取企业微信配置'
      });
    }

    const accessToken = await getWecomAccessToken(config);
    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: '无法获取Access Token'
      });
    }

    const message = {
      touser: testUser,
      msgtype: 'text' as const,
      agentid: config.agent_id,
      text: {
        content: `🧪 企业微信测试消息

${testMessage}

发送时间：${new Date().toLocaleString('zh-CN')}
配置信息：
• 企业ID：${config.corp_id}
• 应用ID：${config.agent_id}

如果您收到此消息，说明企业微信配置正常。`
      }
    };

    const success = await sendWecomMessage(accessToken, message);

    return NextResponse.json({
      success,
      config: {
        corpId: config.corp_id,
        agentId: config.agent_id,
        testUser,
        testMessage
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('发送测试消息失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 