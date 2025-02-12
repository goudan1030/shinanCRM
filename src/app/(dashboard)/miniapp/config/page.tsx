'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const formSchema = z.object({
  appid: z.string().min(1, { message: '请输入小程序 AppID' }),
  appsecret: z.string().min(1, { message: '请输入小程序 AppSecret' })
});

export default function MiniappConfigPage() {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClientComponentClient();
  const [isConfigLoading, setIsConfigLoading] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({    resolver: zodResolver(formSchema),
    defaultValues: {
      appid: '',
      appsecret: ''
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
          .from('miniapp_config')
          .select('*')
          .single();

        if (error) {
          if (error.code !== 'PGRST116') { // PGRST116 means no rows returned
            throw error;
          }
        }

        if (data) {
          form.reset({
            appid: data.appid || '',
            appsecret: data.appsecret || ''
          });
        }
      } catch (error) {
        console.error('获取小程序配置失败:', error);
        toast({
          variant: 'destructive',
          title: '获取配置失败',
          description: '无法加载小程序配置信息，请重试'
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
    form.setValue('appid', values.appid);
    form.setValue('appsecret', values.appsecret);

    try {
      const { error } = await supabase
        .from('miniapp_config')
        .upsert({
          id: 1, // 使用固定ID，确保只有一条配置记录
          appid: values.appid,
          appsecret: values.appsecret,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: '保存成功',
        description: '小程序配置已更新'
      });
    } catch (error) {
      console.error('保存小程序配置失败:', error);
      toast({
        variant: 'destructive',
        title: '保存失败',
        description: error instanceof Error ? error.message : '保存配置失败，请重试'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-4">小程序基础配置</h2>
      <Card className="p-6 border-none shadow-none">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
            <FormField
              control={form.control}
              name="appid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AppID</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入小程序 AppID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="appsecret"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AppSecret</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="请输入小程序 AppSecret" {...field} />
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