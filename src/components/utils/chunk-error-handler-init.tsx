'use client';

import { useEffect } from 'react';
import { setupChunkErrorHandler } from '@/lib/chunk-error-handler';

/**
 * Chunk 错误处理初始化组件
 * 在客户端初始化 chunk 加载错误处理
 */
export function ChunkErrorHandlerInit() {
  useEffect(() => {
    setupChunkErrorHandler();
  }, []);

  return null;
}
