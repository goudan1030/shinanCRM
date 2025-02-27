'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// 表单验证规则
const formSchema = z.object({
  member_no: z.string().min(1, '请输入会员编号'),
  wechat: z.string().min(1, '请输入微信号'),
  phone: z.string().min(1, '请输入手机号'),
  birth_year: z.number().min(1900).max(new Date().getFullYear()).optional(),
  // ... 其他字段验证
});

export function MemberDialog({ 
  open, 
  onOpenChange,
  onSubmit,
  initialData 
}: MemberDialogProps) {
  // 从 localStorage 获取缓存的表单数据
  const getCachedFormData = () => {
    const cached = localStorage.getItem('memberFormData');
    return cached ? JSON.parse(cached) : null;
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || getCachedFormData() || {
      member_no: '',
      wechat: '',
      phone: '',
      birth_year: undefined,
      // ... 其他字段默认值
    }
  });

  // 监听表单变化并保存到缓存
  useEffect(() => {
    const subscription = form.watch((value) => {
      localStorage.setItem('memberFormData', JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  // 表单提交成功后清除缓存
  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await onSubmit(values);
      localStorage.removeItem('memberFormData');
      onOpenChange(false);
    } catch (error) {
      console.error('提交失败:', error);
    }
  };

  // 关闭对话框时不清除缓存
  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? '编辑会员' : '新增会员'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* 出生年份输入框 */}
            <FormField
              control={form.control}
              name="birth_year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>出生年份</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1900"
                      max={new Date().getFullYear()}
                      placeholder="请输入出生年份"
                      {...field}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value >= 1900 && value <= new Date().getFullYear()) {
                          field.onChange(value);
                        }
                      }}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* ... 其他表单字段 ... */}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 