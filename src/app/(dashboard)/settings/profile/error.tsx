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
    console.error('个人设置页面错误:', error);
  }, [error]);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-4">设置页面出现错误</h2>
        <p className="text-gray-600 mb-6">{error.message || '加载个人设置时出现错误，请重试'}</p>
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