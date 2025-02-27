'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn } from '@/lib/utils';

// 分类映射
const CATEGORY_MAP = {
  home: 1,
  activity: 2,
  popup: 3
} as const;

// 添加一个反向映射
const CATEGORY_ID_MAP = {
  1: 'home',
  2: 'activity',
  3: 'popup'
} as const;

// 修改表单验证规则
const formSchema = z.object({
  category_id: z.enum(['home', 'activity', 'popup']),
  title: z.string().min(1, '请输入标题'),
  image_file: z.any().optional(),
  image_url: z.string().optional(),
  link_url: z.string().optional(),
  sort_order: z.coerce.number().min(0, '排序号必须大于等于0'),
  status: z.enum(['0', '1']),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  remark: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface BannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: any) => void;
  initialData?: any;
}

// 添加图片压缩函数
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // 压缩为 80% 质量的 JPEG
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(compressedDataUrl);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

export function BannerDialog({ 
  open, 
  onOpenChange,
  onSubmit,
  initialData 
}: BannerDialogProps) {
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>(initialData?.image_url || '');
  const isEditing = !!initialData;

  // 格式化日期函数
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      // 返回 yyyy-MM-dd 格式
      return date.toISOString().split('T')[0];
    } catch (error) {
      return '';
    }
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category_id: initialData?.category_id ? CATEGORY_ID_MAP[initialData.category_id as keyof typeof CATEGORY_ID_MAP] : 'home',
      title: initialData?.title || '',
      image_url: initialData?.image_url || '',
      link_url: initialData?.link_url || '',
      sort_order: initialData?.sort_order || 0,
      status: String(initialData?.status || '1'),  // 确保转换为字符串
      start_time: formatDate(initialData?.start_time) || '',  // 格式化为 yyyy-MM-dd
      end_time: formatDate(initialData?.end_time) || '',      // 格式化为 yyyy-MM-dd
      remark: initialData?.remark || ''
    }
  });

  // 当 initialData 变化时重置表单
  useEffect(() => {
    if (initialData) {
      form.reset({
        category_id: CATEGORY_ID_MAP[initialData.category_id as keyof typeof CATEGORY_ID_MAP],
        title: initialData.title,
        image_url: initialData.image_url,
        link_url: initialData.link_url || '',
        sort_order: initialData.sort_order,
        status: String(initialData.status),  // 确保转换为字符串
        start_time: formatDate(initialData.start_time),  // 格式化为 yyyy-MM-dd
        end_time: formatDate(initialData.end_time),      // 格式化为 yyyy-MM-dd
        remark: initialData.remark || ''
      });
      setImagePreview(initialData.image_url);
    }
  }, [initialData, form]);

  const handleSubmit = async (values: FormValues) => {
    try {
      setLoading(true);
      const submitData = {
        ...values,
        id: initialData?.id,
        category_id: CATEGORY_MAP[values.category_id as keyof typeof CATEGORY_MAP],
        image_url: imagePreview,
      };
      
      if (onSubmit) {
        await onSubmit(submitData);
      }
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('提交失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        form.setValue('image_file', file);
        // 压缩图片
        const compressedImage = await compressImage(file);
        setImagePreview(compressedImage);
      } catch (error) {
        console.error('图片处理失败:', error);
      }
    }
  };

  const resetForm = () => {
    form.reset();
    setImagePreview('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? '编辑' : '新增'}Banner</DialogTitle>
          <DialogDescription>
            {isEditing ? '编辑当前Banner信息' : '创建一个新的Banner'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>所属分类</FormLabel>
                  <Select
                    value={field.value || 'home'}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择分类" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="home">首页Banner</SelectItem>
                      <SelectItem value="activity">活动Banner</SelectItem>
                      <SelectItem value="popup">弹窗Banner</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>标题</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入标题" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="image_file"
              render={({ field: { value, onChange, ...field } }) => (
                <FormItem>
                  <FormLabel>Banner图片</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-4">
                      <Input 
                        type="file" 
                        accept="image/*"
                        className="w-full"
                        onChange={handleImageChange}
                        {...field}
                      />
                      {imagePreview && (
                        <div className="relative w-20 h-20">
                          <img 
                            src={imagePreview}
                            alt="预览" 
                            className="w-full h-full object-cover rounded"
                          />
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="link_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>跳转链接</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入跳转链接(选填)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sort_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>排序</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="数字越大越靠前" 
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>状态</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择状态" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">显示</SelectItem>
                        <SelectItem value="0">隐藏</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>开始时间</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>结束时间</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="remark"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>备注</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="请输入备注说明(选填)" 
                      className="resize-none" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  resetForm();
                  onOpenChange(false);
                }}
              >
                取消
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !form.formState.isValid || !imagePreview}
              >
                {loading ? '提交中...' : '确定'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 