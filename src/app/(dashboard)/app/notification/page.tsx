'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Bell, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function NotificationPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      toast({
        title: "验证失败",
        description: "请填写标题和内容",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        title: title.trim(),
        content: content.trim()
      };

      const response = await fetch('/api/messages/push/system-notice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: "推送成功",
          description: result.message,
        });
        
        // 清空表单
        setTitle('');
        setContent('');
      } else {
        toast({
          title: "推送失败",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "推送失败",
        description: "网络错误，请稍后重试",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Bell className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">系统通知推送</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>发送系统通知</CardTitle>
          <CardDescription>
            向所有用户发送系统通知消息
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">通知标题 *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请输入通知标题"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">通知内容 *</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="请输入通知内容"
                rows={6}
                maxLength={1000}
              />
              <div className="text-sm text-gray-500">
                {content.length}/1000 字符
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                系统通知将立即发送给所有用户，请确保内容准确无误。
              </AlertDescription>
            </Alert>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setTitle('');
                  setContent('');
                }}
                disabled={isLoading}
              >
                清空
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    发送中...
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    发送通知
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
