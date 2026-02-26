'use client';

import { useCallback, useEffect, useMemo, useRef, useState, ChangeEvent, FormEvent } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/components/ui/use-toast';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const profileSchema = z.object({
  name: z.string().min(1, '请输入账号昵称'),
  avatar_url: z.string().optional()
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface PasswordFormState {
  current: string;
  newPassword: string;
  confirm: string;
}

export default function ProfilePage() {
  const { session } = useAuth();
  const { toast } = useToast();

  const [profileLoading, setProfileLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    current: '',
    newPassword: '',
    confirm: ''
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const assetBaseUrl = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_ASSET_BASE_URL || '';
    return base.replace(/\/$/, '');
  }, []);

  const resolveAvatarUrl = useCallback(
    (value?: string | null) => {
      if (!value) return '';
      if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) {
        return value;
      }
      const normalized = value.startsWith('/') ? value : `/${value}`;
      return assetBaseUrl ? `${assetBaseUrl}${normalized}` : normalized;
    },
    [assetBaseUrl]
  );

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: session?.user?.name || '',
      avatar_url: session?.user?.avatar_url || ''
    }
  });

  const avatarValue = form.watch('avatar_url');
  const [avatarPreview, setAvatarPreview] = useState<string>(resolveAvatarUrl(avatarValue));

  useEffect(() => {
    form.reset({
      name: session?.user?.name || '',
      avatar_url: session?.user?.avatar_url || ''
    });
    setAvatarPreview(resolveAvatarUrl(session?.user?.avatar_url || ''));
  }, [session?.user?.name, session?.user?.avatar_url, form, resolveAvatarUrl]);

  useEffect(() => {
    setAvatarPreview(resolveAvatarUrl(avatarValue));
  }, [avatarValue, resolveAvatarUrl]);

  const handleAvatarUpload = async (file: File) => {
    setAvatarUploading(true);
    setAvatarError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || '上传失败，请重试');
      }

      form.setValue('avatar_url', data.url, { shouldValidate: true });
      setAvatarPreview(resolveAvatarUrl(data.url));
      toast({
        title: '上传成功',
        description: '头像已经更新，请保存资料'
      });
    } catch (error) {
      console.error('上传头像失败:', error);
      setAvatarError(error instanceof Error ? error.message : '上传失败，请重试');
      toast({
        variant: 'destructive',
        title: '上传失败',
        description: error instanceof Error ? error.message : '上传失败，请稍后再试'
      });
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleProfileSubmit = async (values: ProfileFormValues) => {
    setProfileLoading(true);
    try {
      const payload = {
        name: values.name.trim(),
        avatar_url: values.avatar_url?.trim() || ''
      };

      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || '个人资料更新失败');
      }

      form.reset({
        name: data.user?.name || payload.name,
        avatar_url: data.user?.avatar_url || payload.avatar_url
      });
      setAvatarPreview(resolveAvatarUrl(data.user?.avatar_url || payload.avatar_url));

      toast({
        title: '更新成功',
        description: '个人资料已保存'
      });
    } catch (error) {
      console.error('更新个人资料失败:', error);
      toast({
        variant: 'destructive',
        title: '更新失败',
        description: error instanceof Error ? error.message : '个人资料更新失败，请重试'
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAvatarButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirm) {
      setPasswordError('新密码与确认密码不一致');
      setPasswordSuccess(null);
      return;
    }

    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    try {
      const response = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordForm.current,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || '密码更新失败，请重试');
      }

      setPasswordSuccess('密码更新成功');
      setPasswordForm({ current: '', newPassword: '', confirm: '' });
      toast({
        title: '更新成功',
        description: '密码已更新'
      });
    } catch (error) {
      console.error('更新密码失败:', error);
      setPasswordError(error instanceof Error ? error.message : '密码更新失败，请重试');
      toast({
        variant: 'destructive',
        title: '更新失败',
        description: error instanceof Error ? error.message : '密码更新失败，请稍后再试'
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('请选择小于5MB的图片');
      return;
    }
    handleAvatarUpload(file);
  };

  const handleClearAvatar = () => {
    form.setValue('avatar_url', '', { shouldValidate: true });
    setAvatarPreview('');
  };

  return (
    <div className="flex flex-col">
      <div className="grid gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">基本信息</h2>
          <form onSubmit={form.handleSubmit(handleProfileSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">账号昵称</label>
              <Input
                {...form.register('name')}
                placeholder="请输入账号昵称"
                disabled={profileLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">头像</label>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border bg-muted">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="头像预览"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">无头像</span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFileChange}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAvatarButtonClick}
                      disabled={avatarUploading || profileLoading}
                    >
                      {avatarUploading ? '上传中...' : '上传头像'}
                    </Button>
                    {avatarValue && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-2 text-sm text-muted-foreground"
                        onClick={handleClearAvatar}
                        disabled={avatarUploading || profileLoading}
                      >
                        移除头像
                      </Button>
                    )}
                  </div>
                  {avatarValue && (
                    <span className="text-xs text-muted-foreground break-all">
                      存储路径：{avatarValue}
                    </span>
                  )}
                  {avatarError && (
                    <span className="text-xs text-red-500">{avatarError}</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    支持 JPG / PNG / WEBP，大小不超过 5MB
                  </span>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={profileLoading || avatarUploading}>
              {profileLoading ? '保存中...' : '保存'}
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
                value={passwordForm.current}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, current: e.target.value }))}
                placeholder="请输入当前密码"
                disabled={passwordLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">新密码</label>
              <Input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                placeholder="请输入新密码"
                disabled={passwordLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">确认新密码</label>
              <Input
                type="password"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm: e.target.value }))}
                placeholder="请再次输入新密码"
                disabled={passwordLoading}
              />
            </div>

            {passwordError && <div className="text-sm text-red-500">{passwordError}</div>}
            {passwordSuccess && <div className="text-sm text-green-600">{passwordSuccess}</div>}

            <Button type="submit" disabled={passwordLoading}>
              {passwordLoading ? '更新中...' : '更新密码'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
