'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ProfilePage() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', avatar_url: '' });
  const [password, setPassword] = useState({ current: '', new: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 实现更新逻辑
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

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.new !== password.confirm) {
      setError('新密码与确认密码不匹配');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password.new
      });

      if (updateError) throw updateError;
      setSuccess('密码更新成功');
      setPassword({ current: '', new: '', confirm: '' });
    } catch (error) {
      setError(error instanceof Error ? error.message : '密码更新失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="grid gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">基本信息</h2>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">微信昵称</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入微信昵称"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">头像URL</label>
              <Input
                value={formData.avatar_url}
                onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
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
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
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