'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function MembersPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);
      // 请求下载文件
      const exportUrl = `/api/members/export`;
      
      // 使用窗口打开下载链接
      window.open(exportUrl, '_blank');
      
      toast({
        title: '导出处理中',
        description: '正在准备下载文件，请稍候...'
      });

    } catch (error) {
      console.error('导出失败:', error);
      toast({
        variant: 'destructive',
        title: '导出失败',
        description: error instanceof Error ? error.message : '未知错误'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">会员管理</h1>
      
      <div>
        <p className="mb-4">
          原会员管理页面正在修复中，您可以先使用以下功能：
        </p>
        
        <Button 
          onClick={handleExport}
          disabled={loading}
          className="mr-4"
        >
          {loading ? '处理中...' : '导出会员数据'}
        </Button>
        
        <Button 
          variant="outline"
          onClick={() => window.history.back()}
        >
          返回上一页
        </Button>
      </div>
      
      <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <h2 className="text-lg font-semibold text-yellow-800 mb-2">系统维护通知</h2>
        <p className="text-yellow-700">
          会员管理系统正在进行维护升级，完整功能将很快恢复。我们为此带来的不便深表歉意。
        </p>
      </div>
    </div>
  );
} 