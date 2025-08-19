'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Send, Users, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AnnouncementPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetUsers, setTargetUsers] = useState('');
  const [isTargeted, setIsTargeted] = useState(false);
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
      const payload: any = {
        title: title.trim(),
        content: content.trim()
      };

      // 如果启用了定向推送，解析用户ID
      if (isTargeted && targetUsers.trim()) {
        const userIds = targetUsers
          .split(',')
          .map(id => parseInt(id.trim()))
          .filter(id => !isNaN(id));
        
        if (userIds.length > 0) {
          payload.target_users = userIds;
        }
      }

      const response = await fetch('/api/messages/push/announcement', {
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
        setTargetUsers('');
        setIsTargeted(false);
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
        <Send className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">公告推送</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>发送公告</CardTitle>
          <CardDescription>
            向用户发送重要公告信息，支持全体推送或定向推送
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">公告标题 *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请输入公告标题"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">公告内容 *</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="请输入公告内容"
                rows={6}
                maxLength={1000}
              />
              <div className="text-sm text-gray-500">
                {content.length}/1000 字符
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="targeted"
                  checked={isTargeted}
                  onCheckedChange={setIsTargeted}
                />
                <Label htmlFor="targeted">定向推送</Label>
              </div>

              {isTargeted && (
                <div className="space-y-2">
                  <Label htmlFor="targetUsers">目标用户ID</Label>
                  <Input
                    id="targetUsers"
                    value={targetUsers}
                    onChange={(e) => setTargetUsers(e.target.value)}
                    placeholder="请输入用户ID，多个ID用逗号分隔，如：1,2,3"
                  />
                  <div className="text-sm text-gray-500">
                    不填写则发送给所有用户
                  </div>
                </div>
              )}
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                公告推送将立即发送给目标用户，请确保内容准确无误。
                {isTargeted && targetUsers.trim() && (
                  <span className="block mt-1">
                    当前将发送给 {targetUsers.split(',').filter(id => id.trim()).length} 个指定用户
                  </span>
                )}
                {!isTargeted && (
                  <span className="block mt-1">
                    当前将发送给所有用户
                  </span>
                )}
              </AlertDescription>
            </Alert>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setTitle('');
                  setContent('');
                  setTargetUsers('');
                  setIsTargeted(false);
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
                    <Send className="h-4 w-4 mr-2" />
                    发送公告
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
