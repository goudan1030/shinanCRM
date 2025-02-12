'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

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

const formSchema = z.object({
  corp_id: z.string().min(1, '请输入企业ID'),
  agent_id: z.string().min(1, '请输入应用ID'),
  secret: z.string().min(1, '请输入应用Secret')
});

export default function WecomConfigPage() {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClientComponentClient();
  const [isConfigLoading, setIsConfigLoading] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({    
    resolver: zodResolver(formSchema),
    defaultValues: {
      corp_id: '',
      agent_id: '',
      secret: ''
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
        const { data, error } = await supabase
          .from('wecom_config')
          .select('*')
          .single();

        if (error) {
          if (error.code !== 'PGRST116') { // PGRST116 means no rows returned
            throw error;
          }
        }

        if (data) {
          form.reset({
            corp_id: data.corp_id || '',
            agent_id: data.agent_id || '',
            secret: data.secret || ''
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
  }, [session, supabase, toast, form]);

  if (isLoading || isConfigLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const { error } = await supabase
        .from('wecom_config')
        .upsert({
          id: 1, // 使用固定ID，确保只有一条配置记录
          corp_id: values.corp_id,
          agent_id: values.agent_id,
          secret: values.secret,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

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
      <h2 className="text-lg font-semibold mb-4">企业微信基础配置</h2>
      <Card className="p-6 border-none shadow-none">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
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

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "保存中..." : "保存配置"}
            </Button>
          </form>
        </Form>
      </Card>
    </div>
  );
}