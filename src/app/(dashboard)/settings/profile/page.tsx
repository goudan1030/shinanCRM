'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/components/ui/use-toast';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { User } from '@supabase/supabase-js';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// 扩展 User 类型
interface ExtendedUser extends User {
  user_metadata: {
    name?: string;
    avatar_url?: string;
  };
}

// 扩展 Session 类型
interface ExtendedSession {
  user: ExtendedUser;
}

// 添加表单验证 schema
const profileSchema = z.object({
  name: z.string().min(1, '请输入昵称'),
  avatar_url: z.string().url('请输入有效的URL').optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// 添加密码表单的类型
interface PasswordForm {
  current: string;
  new: string;
  confirm: string;
}

export default function ProfilePage() {
  const { session } = useAuth() as { session: ExtendedSession | null };
  const supabase = createClientComponentClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // 添加密码表单状态
  const [password, setPassword] = useState<PasswordForm>({
    current: '',
    new: '',
    confirm: ''
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: session?.user?.user_metadata?.name || '',
      avatar_url: session?.user?.user_metadata?.avatar_url || '',
    },
  });

  const handleProfileUpdate = async (values: ProfileFormValues) => {
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: values
      });

      if (updateError) throw updateError;

      toast({
        title: '更新成功',
        description: '个人信息已更新'
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '更新失败',
        description: error instanceof Error ? error.message : '未知错误'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password.new !== password.confirm) {
      setError('新密码与确认密码不匹配');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: password.current,
          newPassword: password.new
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData);
      }
      
      setSuccess('密码更新成功');
      setPassword({ current: '', new: '', confirm: '' });
      
      toast({
        title: '更新成功',
        description: '密码已更新'
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : '密码更新失败，请重试');
      toast({
        variant: 'destructive',
        title: '更新失败',
        description: error instanceof Error ? error.message : '未知错误'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="grid gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">基本信息</h2>
          <form onSubmit={form.handleSubmit(handleProfileUpdate)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">微信昵称</label>
              <Input
                value={form.watch('name')}
                onChange={(e) => form.setValue('name', e.target.value)}
                placeholder="请输入微信昵称"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">头像URL</label>
              <Input
                value={form.watch('avatar_url')}
                onChange={(e) => form.setValue('avatar_url', e.target.value)}
                placeholder="请输入头像URL"
              />
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? '保存中...' : '保存'}
            </Button>
          </form>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">修改密码</h2>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">当前密码</label>
              <Input
                type="password"
                value={password.current}
                onChange={(e) => setPassword({ ...password, current: e.target.value })}
                placeholder="请输入当前密码"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">新密码</label>
              <Input
                type="password"
                value={password.new}
                onChange={(e) => setPassword({ ...password, new: e.target.value })}
                placeholder="请输入新密码"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">确认新密码</label>
              <Input
                type="password"
                value={password.confirm}
                onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                placeholder="请再次输入新密码"
              />
            </div>

            {error && <div className="text-sm text-red-500">{error}</div>}
            {success && <div className="text-sm text-green-500">{success}</div>}

            <Button type="submit" disabled={loading}>
              {loading ? '更新中...' : '更新密码'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}