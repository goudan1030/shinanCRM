import { NextResponse } from 'next/server';

/**
 * 获取服务器IP信息API
 * GET /api/wecom/ip-info
 */
export async function GET() {
  try {
    const ipInfo: any = {
      timestamp: new Date().toISOString(),
      ips: []
    };

    // 1. 通过多个服务获取外网IP
    const ipServices = [
      'https://api.ipify.org?format=json',
      'https://httpbin.org/ip',
      'https://ipecho.net/plain',
      'https://icanhazip.com',
      'https://ident.me'
    ];

    for (const service of ipServices) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(service, { 
          signal: controller.signal 
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const text = await response.text();
          let ip = '';
          
          try {
            // 尝试解析JSON
            const json = JSON.parse(text);
            ip = json.ip || json.origin || '';
          } catch {
            // 如果不是JSON，直接使用文本
            ip = text.trim();
          }
          
          if (ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
            ipInfo.ips.push({
              service: service,
              ip: ip,
              status: 'success'
            });
          }
        }
      } catch (error) {
        ipInfo.ips.push({
          service: service,
          error: error instanceof Error ? error.message : '获取失败',
          status: 'error'
        });
      }
    }

    // 2. 去重并统计
    const uniqueIps = [...new Set(ipInfo.ips.filter((item: any) => item.ip).map((item: any) => item.ip))];
    ipInfo.unique_ips = uniqueIps;
    ipInfo.main_ip = uniqueIps[0] || '';

    // 3. 测试企业微信API连通性
    try {
      const testResponse = await fetch('https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=test&corpsecret=test');
      ipInfo.wecom_api_accessible = testResponse.status !== 0; // 即使是错误响应，也说明能连通
    } catch {
      ipInfo.wecom_api_accessible = false;
    }

    return NextResponse.json({
      success: true,
      message: '服务器IP信息获取成功',
      data: ipInfo,
      instructions: [
        '1. 复制下面的IP地址',
        '2. 登录企业微信管理后台 (work.weixin.qq.com)',
        '3. 进入应用管理 → 你的应用 → 设置',
        '4. 找到"企业可信IP"或"IP白名单"设置',
        '5. 添加这些IP地址到白名单',
        '6. 保存设置并等待几分钟生效'
      ]
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: '获取IP信息失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
} 