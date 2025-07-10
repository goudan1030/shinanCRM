import { NextResponse } from 'next/server';
import { getWecomConfig, getWecomAccessToken } from '@/lib/wecom-api';
import pool from '@/lib/mysql';

/**
 * 企业微信配置调试API
 * GET /api/wecom/debug
 */
export async function GET() {
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    steps: []
  };

  try {
    // 1. 检查数据库连接
    debugInfo.steps.push({ step: '1. 检查数据库连接', status: 'checking' });
    try {
      await pool.execute('SELECT 1');
      debugInfo.steps[0].status = 'success';
      debugInfo.steps[0].message = '数据库连接正常';
    } catch (error) {
      debugInfo.steps[0].status = 'error';
      debugInfo.steps[0].error = error instanceof Error ? error.message : '数据库连接失败';
      return NextResponse.json(debugInfo, { status: 500 });
    }

    // 2. 检查wecom_config表是否存在
    debugInfo.steps.push({ step: '2. 检查wecom_config表', status: 'checking' });
    try {
      const [tables] = await pool.execute("SHOW TABLES LIKE 'wecom_config'");
      const tableExists = (tables as any[]).length > 0;
      
      if (tableExists) {
        debugInfo.steps[1].status = 'success';
        debugInfo.steps[1].message = 'wecom_config表存在';
      } else {
        debugInfo.steps[1].status = 'error';
        debugInfo.steps[1].error = 'wecom_config表不存在，请先创建表';
        return NextResponse.json(debugInfo, { status: 400 });
      }
    } catch (error) {
      debugInfo.steps[1].status = 'error';
      debugInfo.steps[1].error = error instanceof Error ? error.message : '检查表失败';
      return NextResponse.json(debugInfo, { status: 500 });
    }

    // 3. 检查表结构
    debugInfo.steps.push({ step: '3. 检查表结构', status: 'checking' });
    try {
      const [columns] = await pool.execute("DESCRIBE wecom_config");
      const columnNames = (columns as any[]).map(col => col.Field);
      
      const requiredColumns = ['corp_id', 'agent_id', 'secret'];
      const newColumns = ['member_notification_enabled', 'notification_recipients', 'message_type', 'custom_message_template'];
      
      const missingRequired = requiredColumns.filter(col => !columnNames.includes(col));
      const missingNew = newColumns.filter(col => !columnNames.includes(col));
      
      if (missingRequired.length > 0) {
        debugInfo.steps[2].status = 'error';
        debugInfo.steps[2].error = `缺少基础字段: ${missingRequired.join(', ')}`;
        return NextResponse.json(debugInfo, { status: 400 });
      }
      
      debugInfo.steps[2].status = 'success';
      debugInfo.steps[2].message = '基础表结构正常';
      debugInfo.steps[2].data = {
        allColumns: columnNames,
        missingNewColumns: missingNew
      };
      
      if (missingNew.length > 0) {
        debugInfo.steps[2].warning = `缺少新增字段: ${missingNew.join(', ')}，请执行数据库迁移`;
      }
    } catch (error) {
      debugInfo.steps[2].status = 'error';
      debugInfo.steps[2].error = error instanceof Error ? error.message : '检查表结构失败';
      return NextResponse.json(debugInfo, { status: 500 });
    }

    // 4. 检查企业微信配置
    debugInfo.steps.push({ step: '4. 检查企业微信配置', status: 'checking' });
    try {
      const [rows] = await pool.execute('SELECT * FROM wecom_config LIMIT 1');
      const configs = rows as any[];
      
      if (configs.length === 0) {
        debugInfo.steps[3].status = 'error';
        debugInfo.steps[3].error = '未找到企业微信配置，请先在企微管理页面配置';
        return NextResponse.json(debugInfo, { status: 400 });
      }
      
      const config = configs[0];
      const configStatus = {
        corp_id: !!config.corp_id,
        agent_id: !!config.agent_id,
        secret: !!config.secret,
        member_notification_enabled: config.member_notification_enabled !== false
      };
      
      const missingConfig = Object.entries(configStatus)
        .filter(([key, value]) => !value && key !== 'member_notification_enabled')
        .map(([key]) => key);
      
      if (missingConfig.length > 0) {
        debugInfo.steps[3].status = 'error';
        debugInfo.steps[3].error = `企业微信配置不完整，缺少: ${missingConfig.join(', ')}`;
        debugInfo.steps[3].data = configStatus;
        return NextResponse.json(debugInfo, { status: 400 });
      }
      
      if (!configStatus.member_notification_enabled) {
        debugInfo.steps[3].status = 'warning';
        debugInfo.steps[3].warning = '会员通知功能已禁用';
      } else {
        debugInfo.steps[3].status = 'success';
        debugInfo.steps[3].message = '企业微信基础配置完整';
      }
      
      debugInfo.steps[3].data = {
        ...configStatus,
        notification_recipients: config.notification_recipients || '@all',
        message_type: config.message_type || 'textcard'
      };
    } catch (error) {
      debugInfo.steps[3].status = 'error';
      debugInfo.steps[3].error = error instanceof Error ? error.message : '检查配置失败';
      return NextResponse.json(debugInfo, { status: 500 });
    }

    // 5. 测试获取Access Token
    debugInfo.steps.push({ step: '5. 测试Access Token获取', status: 'checking' });
    try {
      const config = await getWecomConfig();
      if (!config) {
        debugInfo.steps[4].status = 'error';
        debugInfo.steps[4].error = '无法获取企业微信配置';
        return NextResponse.json(debugInfo, { status: 400 });
      }
      
      const accessToken = await getWecomAccessToken(config);
      if (!accessToken) {
        debugInfo.steps[4].status = 'error';
        debugInfo.steps[4].error = '无法获取Access Token，请检查corp_id和secret是否正确';
        return NextResponse.json(debugInfo, { status: 400 });
      }
      
      debugInfo.steps[4].status = 'success';
      debugInfo.steps[4].message = 'Access Token获取成功';
      debugInfo.steps[4].data = {
        tokenLength: accessToken.length,
        tokenPrefix: accessToken.substring(0, 10) + '...'
      };
    } catch (error) {
      debugInfo.steps[4].status = 'error';
      debugInfo.steps[4].error = error instanceof Error ? error.message : '获取Access Token失败';
      return NextResponse.json(debugInfo, { status: 500 });
    }

    // 如果所有步骤都成功
    debugInfo.overall_status = 'success';
    debugInfo.message = '所有检查都通过，企业微信配置正常！';
    
    return NextResponse.json(debugInfo);
    
  } catch (error) {
    debugInfo.overall_status = 'error';
    debugInfo.error = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(debugInfo, { status: 500 });
  }
} 