import { NextRequest, NextResponse } from 'next/server';
import { 
  initCacheService, 
  getCacheStats, 
  clearNamespaceCache, 
  clearAllCaches, 
  reloadNamespaceCache,
  preloadAllCaches,
  checkCacheHealth
} from '../../../../lib/cache/cache-service';

// 初始化缓存服务
initCacheService().catch(error => {
  console.error('API路由中缓存服务初始化失败:', error);
});

/**
 * GET 获取缓存统计信息
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  
  // 检查缓存健康状态
  if (action === 'health') {
    const healthData = checkCacheHealth();
    return NextResponse.json(healthData);
  }
  
  // 返回所有缓存统计信息
  const stats = getCacheStats();
  return NextResponse.json({
    initialized: stats.length > 0,
    stats,
    timestamp: new Date().toISOString()
  });
}

/**
 * POST 执行缓存管理操作
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json() as { 
      action: string;
      namespace?: string;
    };
    
    const { action, namespace } = data;
    
    switch (action) {
      // 清空指定命名空间的缓存
      case 'clear_namespace':
        if (!namespace) {
          return NextResponse.json(
            { success: false, message: '缺少命名空间参数' },
            { status: 400 }
          );
        }
        
        const cleared = clearNamespaceCache(namespace);
        return NextResponse.json({
          success: cleared,
          message: cleared ? `${namespace} 缓存已清空` : `${namespace} 缓存不存在`
        });
      
      // 清空所有缓存
      case 'clear_all':
        clearAllCaches();
        return NextResponse.json({
          success: true,
          message: '所有缓存已清空'
        });
      
      // 重新预热指定命名空间的缓存
      case 'reload_namespace':
        if (!namespace) {
          return NextResponse.json(
            { success: false, message: '缺少命名空间参数' },
            { status: 400 }
          );
        }
        
        const reloaded = await reloadNamespaceCache(namespace);
        return NextResponse.json({
          success: reloaded,
          message: reloaded ? `${namespace} 缓存已重新预热` : `${namespace} 缓存不存在或预热失败`
        });
      
      // 预热所有缓存
      case 'preload_all':
        await preloadAllCaches();
        return NextResponse.json({
          success: true,
          message: '所有缓存已预热'
        });
      
      default:
        return NextResponse.json(
          { success: false, message: `不支持的操作: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('缓存管理操作失败:', error);
    return NextResponse.json(
      { success: false, message: `操作失败: ${error.message}` },
      { status: 500 }
    );
  }
} 