'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';

interface CollectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CollectDialog({ open, onOpenChange }: CollectDialogProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) {
      toast({
        variant: "destructive",
        title: "请输入链接",
        description: "请输入需要采集的公众号文章链接"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/platform/article/collect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '采集失败');
      }

      toast({
        title: "采集成功",
        description: "文章已保存到数据库"
      });

      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error('采集失败:', error);
      toast({
        variant: "destructive",
        title: "采集失败",
        description: error instanceof Error ? error.message : "操作失败，请重试"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>采集公众号文章</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="请输入公众号文章链接"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button 
              type="submit"
              disabled={loading || !url}
            >
              {loading ? '采集中...' : '确认采集'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 