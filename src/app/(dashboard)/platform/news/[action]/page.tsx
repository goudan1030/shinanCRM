'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
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
import { ArrowLeft } from 'lucide-react';

// 表单验证规则
const formSchema = z.object({
  title: z.string().min(1, '请输入标题'),
  cover_url: z.string().min(1, '请上传封面图片'),
  content: z.string().optional(),
  summary: z.string().optional(),
  link_url: z.string().optional(),
  is_hidden: z.number(),
  is_top: z.number(),
  sort_order: z.number(),
});

export default function NewsEditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      cover_url: '',
      content: '',
      summary: '',
      link_url: '',
      is_hidden: 0,
      is_top: 0,
      sort_order: 0,
    },
    mode: 'onChange'
  });

  // 获取文章详情
  useEffect(() => {
    if (id) {
      const fetchArticle = async () => {
        try {
          const response = await fetch(`/api/platform/article/${id}`);
          const result = await response.json();
          
          if (result.success) {
            const article = result.data;
            form.reset({
              title: article.title,
              cover_url: article.cover_url,
              content: article.content,
              summary: article.summary || '',
              link_url: article.link_url || '',
              is_hidden: article.is_hidden,
              is_top: article.is_top,
              sort_order: article.sort_order,
            });
            setImagePreview(article.cover_url);
          }
        } catch (error) {
          console.error('获取文章详情失败:', error);
          toast({
            variant: "destructive",
            title: "获取失败",
            description: "获取文章详情失败"
          });
        }
      };

      fetchArticle();
    }
  }, [id, form]);

  // 处理图片上传
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // 压缩图片
        const compressedBlob = await compressImage(file);
        const compressedFile = new File([compressedBlob], file.name, {
          type: 'image/jpeg'
        });

        const formData = new FormData();
        formData.append('file', compressedFile);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || '上传失败');
        }

        setImagePreview(result.url);
        form.setValue('cover_url', result.url);
      } catch (error) {
        console.error('图片上传失败:', error);
        toast({
          variant: "destructive",
          title: "上传失败",
          description: error instanceof Error ? error.message : "图片上传失败，请重试"
        });
      }
    }
  };

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    const content = values.content;
    
    // 如果没有内容但有链接，不需要验证内容
    if (!content && !values.link_url) {
      toast({
        variant: "destructive",
        title: "验证失败",
        description: "请输入文章内容或文章链接"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/platform/article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          id: id || undefined,
          content: content || '' // 如果只有链接，内容可以为空
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '提交失败');
      }

      toast({
        title: "保存成功",
        description: "文章信息已保存",
      });

      router.push('/platform/news');
    } catch (error) {
      console.error('保存文章失败:', error);
      toast({
        variant: "destructive",
        title: "保存失败",
        description: error instanceof Error ? error.message : "操作失败，请重试",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">
          {id ? '编辑文章' : '新增文章'}
        </h2>
      </div>

      <Card className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
                    <div className="space-y-4">
                      <Input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                      {imagePreview && (
                        <div className="relative w-60 h-32">
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

            <FormField
              control={form.control}
              name="link_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>文章链接</FormLabel>
                  <FormControl>
                    <Input 
                      type="url" 
                      placeholder="请输入文章链接（选填）" 
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
                onClick={() => router.push('/platform/news')}
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
      </Card>

      {form.watch('content') && (
        <div className="mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.open(form.watch('content'), '_blank')}
          >
            阅读原文
          </Button>
        </div>
      )}
    </div>
  );
} 