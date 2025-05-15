/**
 * 性能指标收集API
 * 
 * 用于接收和处理前端发送的性能监控数据
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 性能指标接口
interface PerformanceMetric {
  name: string;         // 指标名称
  value: number;        // 指标值
  page: string;         // 页面路径
  timestamp?: number;   // 时间戳
  userAgent?: string;   // 用户代理
  connection?: string;  // 网络连接类型
  url?: string;         // 资源URL(仅对API_TIMING指标有效)
}

/**
 * 处理性能指标数据的API路由
 * 接收前端发送的性能指标数据并保存到数据库
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // 检查必要字段
    if (!data.name || typeof data.value !== 'number' || !data.page || !data.timestamp) {
      return NextResponse.json(
        { error: '缺少必要的性能指标字段' },
        { status: 400 }
      );
    }
    
    // 获取用户代理
    const userAgent = request.headers.get('user-agent') || '';
    
    // 保存到数据库
    await query(`
      INSERT INTO performance_metrics 
      (name, value, page, timestamp, user_agent, connection_info, resource_url) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      data.name,
      data.value,
      data.page,
      data.timestamp,
      userAgent,
      data.connectionInfo || null,
      data.resourceUrl || null
    ]);
    
    // 检查是否需要发出性能警报
    await checkForPerformanceAlerts(data);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('保存性能指标数据失败:', error);
    return NextResponse.json(
      { error: '保存性能指标失败' },
      { status: 500 }
    );
  }
}

/**
 * 获取性能指标数据
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start') || '';
    const end = searchParams.get('end') || '';
    const metric = searchParams.get('metric') || '';
    const page = searchParams.get('page') || '';
    
    // 构建查询条件
    let conditions = [];
    let params = [];
    
    if (start) {
      conditions.push('timestamp >= ?');
      params.push(start);
    }
    
    if (end) {
      conditions.push('timestamp <= ?');
      params.push(end);
    }
    
    if (metric) {
      conditions.push('name = ?');
      params.push(metric);
    }
    
    if (page) {
      conditions.push('page = ?');
      params.push(page);
    }
    
    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';
    
    // 获取性能指标数据
    const metrics = await query(`
      SELECT 
        name, 
        AVG(value) as avg_value, 
        MAX(value) as max_value, 
        COUNT(*) as count, 
        page
      FROM performance_metrics
      ${whereClause}
      GROUP BY name, page
      ORDER BY name, page
    `, params);
    
    // 获取时间段内的API调用数据
    const apiCalls = await query(`
      SELECT 
        endpoint, 
        AVG(value) as avg_duration, 
        COUNT(*) as count
      FROM performance_metrics
      WHERE name = 'ApiCall'
      ${whereClause ? whereClause.replace('WHERE', 'AND') : ''}
      GROUP BY endpoint
      ORDER BY avg_duration DESC
      LIMIT 10
    `, params);
    
    return NextResponse.json({
      data: metrics,
      apiCalls,
      period: {
        startDate: start || '',
        endDate: end || ''
      }
    });
  } catch (error) {
    console.error('获取性能指标数据失败:', error);
    return NextResponse.json(
      { error: '获取性能指标失败' },
      { status: 500 }
    );
  }
}

/**
 * 检查性能指标是否需要发出警报
 */
async function checkForPerformanceAlerts(data: any) {
  try {
    // 定义各指标的警报阈值
    const thresholds: Record<string, { threshold: number, severity: 'low' | 'medium' | 'high' }> = {
      'LCP': { threshold: 2500, severity: 'medium' }, // 2.5秒
      'FID': { threshold: 100, severity: 'high' },   // 100毫秒
      'CLS': { threshold: 0.1, severity: 'medium' }, // 0.1
      'TTFB': { threshold: 600, severity: 'low' },   // 600毫秒
      'INP': { threshold: 200, severity: 'medium' }, // 200毫秒
      'LongTask': { threshold: 100, severity: 'low' } // 100毫秒
    };
    
    // 检查当前指标是否超过阈值
    const metricThreshold = thresholds[data.name];
    if (metricThreshold && data.value > metricThreshold.threshold) {
      // 记录性能警报
      await query(`
        INSERT INTO performance_alerts
        (metric_name, metric_value, threshold, page, severity, user_agent, occurred_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        data.name,
        data.value,
        metricThreshold.threshold,
        data.page,
        metricThreshold.severity,
        data.userAgent || null,
        data.timestamp
      ]);
      
      // 这里可以添加更多警报机制，例如发送邮件通知等
      console.warn(`性能警报: ${data.name} = ${data.value}, 阈值 = ${metricThreshold.threshold}`);
    }
  } catch (error) {
    console.error('检查性能警报失败:', error);
  }
} 