import { NextRequest, NextResponse } from 'next/server';
import { getWecomConfig, getWecomAccessToken } from '@/lib/wecom-api';
import { executeQuery } from '@/lib/database-netlify';

/**
 * 企业微信状态监控API
 * 
 * 用于查看企业微信消息处理的实时状态和统计信息
 */

export async function GET(request: NextRequest) {
  try {
    console.log('📊 获取企业微信状态信息...');
    
    const statusInfo = {
      timestamp: new Date().toISOString(),
      config: {
        status: 'checking',
        message: '',
        details: null
      },
      connection: {
        status: 'checking',
        message: '',
        details: null
      },
      statistics: {
        status: 'checking',
        message: '',
        details: null
      },
      recentActivity: {
        status: 'checking',
        message: '',
        details: null
      }
    };

    // 1. 检查配置状态
    try {
      console.log('1. 检查配置状态...');
      const config = await getWecomConfig();
      if (config) {
        statusInfo.config.status = 'success';
        statusInfo.config.message = '企业微信配置正常';
        statusInfo.config.details = {
          corpId: config.corp_id,
          agentId: config.agent_id,
          memberNotificationEnabled: config.member_notification_enabled,
          notificationRecipients: config.notification_recipients,
          messageType: config.message_type
        };
        console.log('✓ 企业微信配置正常');
      } else {
        statusInfo.config.status = 'error';
        statusInfo.config.message = '未找到企业微信配置';
        console.log('✗ 未找到企业微信配置');
      }
    } catch (error) {
      statusInfo.config.status = 'error';
      statusInfo.config.message = '配置检查失败';
      console.error('✗ 配置检查失败:', error);
    }

    // 2. 检查连接状态
    try {
      console.log('2. 检查连接状态...');
      const config = await getWecomConfig();
      if (config) {
        const accessToken = await getWecomAccessToken(config);
        if (accessToken) {
          statusInfo.connection.status = 'success';
          statusInfo.connection.message = '企业微信连接正常';
          statusInfo.connection.details = {
            accessTokenAvailable: true,
            tokenPreview: accessToken.substring(0, 10) + '...',
            configValid: true
          };
          console.log('✓ 企业微信连接正常');
        } else {
          statusInfo.connection.status = 'error';
          statusInfo.connection.message = '无法获取Access Token';
          console.log('✗ 无法获取Access Token');
        }
      } else {
        statusInfo.connection.status = 'error';
        statusInfo.connection.message = '无法获取企业微信配置';
        console.log('✗ 无法获取企业微信配置');
      }
    } catch (error) {
      statusInfo.connection.status = 'error';
      statusInfo.connection.message = '连接检查失败';
      console.error('✗ 连接检查失败:', error);
    }

    // 3. 获取统计信息
    try {
      console.log('3. 获取统计信息...');
      
      // 获取会员总数
      const [memberCountResult] = await executeQuery('SELECT COUNT(*) as total FROM members WHERE deleted = 0');
      const memberCount = memberCountResult[0]?.total || 0;
      
      // 获取今日新增会员数
      const [todayNewMembersResult] = await executeQuery(
        'SELECT COUNT(*) as total FROM members WHERE deleted = 0 AND DATE(created_at) = CURDATE()'
      );
      const todayNewMembers = todayNewMembersResult[0]?.total || 0;
      
      // 获取本月新增会员数
      const [monthNewMembersResult] = await executeQuery(
        'SELECT COUNT(*) as total FROM members WHERE deleted = 0 AND YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())'
      );
      const monthNewMembers = monthNewMembersResult[0]?.total || 0;
      
      // 获取活跃会员数（最近30天有更新的）
      const [activeMembersResult] = await executeQuery(
        'SELECT COUNT(*) as total FROM members WHERE deleted = 0 AND updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)'
      );
      const activeMembers = activeMembersResult[0]?.total || 0;
      
      statusInfo.statistics.status = 'success';
      statusInfo.statistics.message = '统计信息获取成功';
      statusInfo.statistics.details = {
        totalMembers: memberCount,
        todayNewMembers,
        monthNewMembers,
        activeMembers,
        lastUpdated: new Date().toISOString()
      };
      console.log('✓ 统计信息获取成功');
    } catch (error) {
      statusInfo.statistics.status = 'error';
      statusInfo.statistics.message = '统计信息获取失败';
      console.error('✗ 统计信息获取失败:', error);
    }

    // 4. 获取最近活动
    try {
      console.log('4. 获取最近活动...');
      
      // 获取最近注册的会员
      const [recentMembersResult] = await executeQuery(
        'SELECT id, member_no, nickname, gender, type, created_at FROM members WHERE deleted = 0 ORDER BY created_at DESC LIMIT 5'
      );
      
      // 获取最近更新的会员
      const [recentUpdatesResult] = await executeQuery(
        'SELECT id, member_no, nickname, gender, type, updated_at FROM members WHERE deleted = 0 ORDER BY updated_at DESC LIMIT 5'
      );
      
      statusInfo.recentActivity.status = 'success';
      statusInfo.recentActivity.message = '最近活动获取成功';
      statusInfo.recentActivity.details = {
        recentMembers: recentMembersResult,
        recentUpdates: recentUpdatesResult,
        lastUpdated: new Date().toISOString()
      };
      console.log('✓ 最近活动获取成功');
    } catch (error) {
      statusInfo.recentActivity.status = 'error';
      statusInfo.recentActivity.message = '最近活动获取失败';
      console.error('✗ 最近活动获取失败:', error);
    }

    return NextResponse.json(statusInfo);

  } catch (error) {
    console.error('获取状态信息失败:', error);
    return NextResponse.json({
      error: '获取状态信息失败',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    console.log(`🔄 执行状态操作: ${action}`);

    switch (action) {
      case 'refresh':
        // 刷新状态信息
        return await GET(request);
        
      case 'test_connection':
        // 测试连接
        try {
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

          return NextResponse.json({
            success: true,
            message: '连接测试成功',
            config: {
              corpId: config.corp_id,
              agentId: config.agent_id
            },
            accessToken: accessToken.substring(0, 10) + '...'
          });
        } catch (error) {
          return NextResponse.json({
            success: false,
            error: error.message
          });
        }
        
      case 'get_member_sample':
        // 获取会员样本数据
        try {
          const [membersResult] = await executeQuery(
            'SELECT id, member_no, nickname, gender, type, status, created_at FROM members WHERE deleted = 0 ORDER BY RAND() LIMIT 3'
          );
          
          return NextResponse.json({
            success: true,
            message: '会员样本获取成功',
            members: membersResult
          });
        } catch (error) {
          return NextResponse.json({
            success: false,
            error: error.message
          });
        }
        
      default:
        return NextResponse.json({
          success: false,
          error: '未知操作',
          supportedActions: ['refresh', 'test_connection', 'get_member_sample']
        });
    }

  } catch (error) {
    console.error('执行状态操作失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 