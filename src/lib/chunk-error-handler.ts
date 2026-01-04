/**
 * Chunk 加载错误处理工具
 * 用于处理 Next.js 代码分割时的 chunk 加载失败问题
 */

/**
 * 处理 chunk 加载失败
 * 当 chunk 加载失败时，尝试重新加载页面或显示友好错误
 */
export function handleChunkError(error: Error, retryCount = 0): void {
  const maxRetries = 3;
  
  console.error('Chunk 加载失败:', error);
  
  // 检查是否是 chunk 加载错误
  const isChunkError = 
    error.message.includes('Loading chunk') ||
    error.message.includes('Failed to fetch dynamically imported module') ||
    error.message.includes('ChunkLoadError') ||
    error.name === 'ChunkLoadError';
  
  if (!isChunkError) {
    // 不是 chunk 错误，直接抛出
    throw error;
  }
  
  // 如果是 chunk 错误且未超过重试次数，尝试重新加载
  if (retryCount < maxRetries) {
    console.warn(`Chunk 加载失败，尝试重新加载 (${retryCount + 1}/${maxRetries})...`);
    
    // 延迟后重新加载页面
    setTimeout(() => {
      // 清除可能的缓存
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }
      
      // 重新加载页面
      window.location.reload();
    }, 1000 * (retryCount + 1)); // 递增延迟
  } else {
    // 超过重试次数，显示错误提示
    console.error('Chunk 加载失败，已达到最大重试次数');
    
    // 可以显示一个友好的错误提示
    if (typeof window !== 'undefined') {
      const errorMessage = document.createElement('div');
      errorMessage.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 400px;
        text-align: center;
      `;
      errorMessage.innerHTML = `
        <h3 style="margin: 0 0 10px 0; color: #dc3545;">资源加载失败</h3>
        <p style="margin: 0 0 15px 0; color: #666;">页面资源加载失败，请刷新页面重试</p>
        <button onclick="window.location.reload()" style="
          background: #007bff;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        ">刷新页面</button>
      `;
      document.body.appendChild(errorMessage);
    }
  }
}

/**
 * 包装动态导入，添加错误处理
 */
export function safeDynamicImport<T>(
  importFn: () => Promise<T>,
  retryCount = 0
): Promise<T> {
  return importFn().catch((error) => {
    handleChunkError(error, retryCount);
    // 重新抛出错误以便上层处理
    throw error;
  });
}

/**
 * 监听全局 chunk 加载错误
 */
export function setupChunkErrorHandler(): void {
  if (typeof window === 'undefined') return;
  
  // 监听未处理的 Promise 拒绝（chunk 加载失败通常会导致这个）
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    
    if (
      error instanceof Error &&
      (error.message.includes('Loading chunk') ||
       error.message.includes('Failed to fetch dynamically imported module') ||
       error.message.includes('ChunkLoadError'))
    ) {
      event.preventDefault(); // 阻止默认的错误处理
      handleChunkError(error);
    }
  });
  
  // 监听错误事件
  window.addEventListener('error', (event) => {
    if (
      event.message.includes('Loading chunk') ||
      event.message.includes('ChunkLoadError')
    ) {
      event.preventDefault();
      handleChunkError(new Error(event.message));
    }
  });
}
