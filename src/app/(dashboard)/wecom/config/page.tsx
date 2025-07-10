'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  corp_id: z.string().min(1, '请输入企业ID'),
  agent_id: z.string().min(1, '请输入应用ID'),
  secret: z.string().min(1, '请输入应用Secret'),
  member_notification_enabled: z.boolean().default(true),
  notification_recipients: z.string().default('@all'),
  message_type: z.enum(['text', 'textcard', 'markdown']).default('textcard'),
  custom_message_template: z.string().optional()
});

export default function WecomConfigPage() {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({    
    resolver: zodResolver(formSchema),
    defaultValues: {
      corp_id: '',
      agent_id: '',
      secret: '',
      member_notification_enabled: true,
      notification_recipients: '@all',
      message_type: 'textcard' as const,
      custom_message_template: ''
    }
  });

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/login');
    }
  }, [isLoading, session, router]);

  useEffect(() => {
    async function fetchConfig() {
      try {
        setIsConfigLoading(true);
        const response = await fetch('/api/wecom/config');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '获取配置失败');
        }

        if (data) {
          form.reset({
            corp_id: data.corp_id || '',
            agent_id: data.agent_id || '',
            secret: data.secret || '',
            member_notification_enabled: data.member_notification_enabled !== false,
            notification_recipients: data.notification_recipients || '@all',
            message_type: data.message_type || 'textcard',
            custom_message_template: data.custom_message_template || ''
          });
        }
      } catch (error) {
        console.error('获取企业微信配置失败:', error);
        toast({
          variant: 'destructive',
          title: '获取配置失败',
          description: '无法加载企业微信配置信息，请重试'
        });
      } finally {
        setIsConfigLoading(false);
      }
    }

    if (session) {
      fetchConfig();
    }
  }, [session, toast, form]);

  // 测试通知功能
  const handleTestNotification = async () => {
    try {
      setIsTesting(true);
      
      const response = await fetch('/api/wecom/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: '测试成功',
          description: data.message
        });
      } else {
        toast({
          variant: 'destructive',
          title: '测试失败',
          description: data.message
        });
      }
    } catch (error) {
      console.error('测试通知失败:', error);
      toast({
        variant: 'destructive',
        title: '测试失败',
        description: '测试过程中发生错误，请重试'
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading || isConfigLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const response = await fetch('/api/wecom/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '保存失败');
      }

      toast({
        title: '保存成功',
        description: '企业微信配置已更新'
      });
    } catch (error) {
      console.error('保存企业微信配置失败:', error);
      toast({
        variant: 'destructive',
        title: '保存失败',
        description: error instanceof Error ? error.message : '保存配置失败，请重试'
      });
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">企业微信配置</h2>
        <Button 
          onClick={handleTestNotification}
          disabled={isTesting || !form.watch('corp_id') || !form.watch('agent_id') || !form.watch('secret')}
          variant="outline"
        >
          {isTesting ? '测试中...' : '测试通知'}
        </Button>
      </div>
      
      <Card className="p-6 border-none shadow-none">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
            {/* 基础配置部分 */}
            <div className="space-y-4">
              <h3 className="text-md font-medium">基础配置</h3>
              
              <FormField
                control={form.control}
                name="corp_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>企业ID</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入企业ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="agent_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>应用ID</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入应用ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="secret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>应用Secret</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="请输入应用Secret" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 通知配置部分 */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-md font-medium">通知配置</h3>
              
              <FormField
                control={form.control}
                name="member_notification_enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        会员登记通知
                      </FormLabel>
                      <div className="text-sm text-muted-foreground">
                        当有新会员登记时自动发送企业微信通知
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notification_recipients"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>通知接收者</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="@all（全体成员）或用户ID，多个用|分隔" 
                        {...field} 
                      />
                    </FormControl>
                    <div className="text-sm text-muted-foreground">
                      默认@all发送给全体成员，也可指定具体用户ID，多个用|分隔
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>消息类型</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择消息类型" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="textcard">卡片消息（推荐）</SelectItem>
                        <SelectItem value="text">文本消息</SelectItem>
                        <SelectItem value="markdown">Markdown消息</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="text-sm text-muted-foreground">
                      卡片消息格式更美观，支持点击查看详情
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="custom_message_template"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>自定义消息模板（可选）</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="留空使用默认模板，变量格式：会员编号、昵称、手机号等"
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <div className="text-sm text-muted-foreground">
                      支持变量替换，会员编号、昵称、手机号等会自动替换
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "保存中..." : "保存配置"}
            </Button>
          </form>
        </Form>
      </Card>
    </div>
  );
}