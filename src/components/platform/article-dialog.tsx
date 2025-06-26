'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from '@/components/ui/use-toast';
import { compressImage } from '@/lib/image';

// 表单验证规则
const formSchema = z.object({
  title: z.string().min(1, '请输入标题'),
  cover_url: z.string().min(1, '请上传封面图片'),
  content: z.string().min(1, '请输入文章内容'),
  summary: z.string().optional(),
  is_hidden: z.number(),
  is_top: z.number(),
  sort_order: z.number(),
});

interface ArticleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: any) => void;
  initialData?: any;
}

export function ArticleDialog({ 
  open, 
  onOpenChange,
  onSubmit,
  initialData 
}: ArticleDialogProps) {
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>(initialData?.cover_url || '');
  const isEditing = !!initialData;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || '',
      cover_url: initialData?.cover_url || '',
      content: initialData?.content || '',
      summary: initialData?.summary || '',
      is_hidden: initialData?.is_hidden || 0,
      is_top: initialData?.is_top || 0,
      sort_order: initialData?.sort_order || 0,
    }
  });

  // 处理图片上传
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // 压缩图片
        const compressedBlob = await compressImage(file, 800);
        
        // 转换为 Base64
        const reader = new FileReader();
        reader.readAsDataURL(compressedBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          // 检查是否已经是 Base64 格式
          if (!base64data.startsWith('data:image/')) {
            throw new Error('图片格式转换失败');
          }
          setImagePreview(base64data);
          form.setValue('cover_url', base64data);
        };

      } catch (error) {
        console.error('图片处理失败:', error);
        toast({
          variant: "destructive",
          title: "上传失败",
          description: error instanceof Error ? error.message : "图片处理失败，请重试"
        });
      }
    }
  };

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (onSubmit) {
      setLoading(true);
      try {
        await onSubmit({
          ...values,
          id: initialData?.id,
          content: values.content
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    form.reset();
    setImagePreview('');
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(open) => {
        if (!open) {
          resetForm();
        }
        onOpenChange(open);
      }}
    >
      <DialogContent className="w-[95%] max-w-[800px] mx-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? '编辑' : '新增'}文章</DialogTitle>
          <DialogDescription>
            {isEditing ? '编辑文章内容' : '创建一篇新的文章'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>标题</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入文章标题" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cover_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>封面图片</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                      {imagePreview && (
                        <div className="mt-2">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="max-h-[200px] object-contain"
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
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>文章内容</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="请输入文章内容" 
                      className="min-h-[300px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>摘要</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="请输入文章摘要(选填)" 
                      className="resize-none" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center space-x-8">
              <FormField
                control={form.control}
                name="is_top"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Switch
                        checked={field.value === 1}
                        onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                      />
                    </FormControl>
                    <Label>置顶</Label>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_hidden"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Switch
                        checked={field.value === 0}
                        onCheckedChange={(checked) => field.onChange(checked ? 0 : 1)}
                      />
                    </FormControl>
                    <Label>显示</Label>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button 
                type="submit"
                disabled={loading || !form.formState.isValid}
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