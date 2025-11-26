'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 正确提取错误信息，避免显示 [object Object]
    const errorMessage = error instanceof Error 
      ? error.message 
      : (typeof error === 'object' && error !== null && 'message' in error)
        ? String((error as any).message)
        : String(error || '未知错误');
    
    console.error('页面错误:', errorMessage, error);
  }, [error]);

  // 安全地提取错误消息
  const getErrorMessage = () => {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'object' && error !== null) {
      if ('message' in error) {
        return String((error as any).message);
      }
      // 尝试序列化对象
      try {
        return JSON.stringify(error);
      } catch {
        return '发生了一些错误，请重试';
      }
    }
    return String(error || '发生了一些错误，请重试');
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">页面出现错误</h2>
        <p className="text-gray-600 mb-6">{getErrorMessage()}</p>
        <Button
          onClick={() => reset()}
          variant="outline"
        >
          重试
        </Button>
      </div>
    </div>
  );
}