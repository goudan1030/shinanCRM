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
    console.error('页面错误:', error);
  }, [error]);

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">页面出现错误</h2>
        <p className="text-gray-600 mb-6">{error.message || '发生了一些错误，请重试'}</p>
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