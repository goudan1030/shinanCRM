'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusCircle, Pencil, Trash2, Eye, EyeOff, ArrowUp, Download } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { ArticleDialog } from '@/components/platform/article-dialog';
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { useRouter } from 'next/navigation';
import { CollectDialog } from '@/components/platform/collect-dialog';

export default function NewsPage() {
  const { toast } = useToast();
  const [articles, setArticles] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [openCollectDialog, setOpenCollectDialog] = useState(false);
  const router = useRouter();

  // 获取文章列表
  const fetchArticles = async () => {
    try {
      const response = await fetch('/api/platform/article');
      const result = await response.json();
      if (result.success) {
        setArticles(result.data);
      }
    } catch (error) {
      console.error('获取文章列表失败:', error);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  // 添加操作函数
  const handleEdit = (article: any) => {
    setEditingArticle(article);
    setOpenDialog(true);
  };

  const handleDelete = async (id: number) => {
    setDeleteId(id);
  };

  const handleSubmit = async (data: any) => {
    try {
      const response = await fetch('/api/platform/article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '提交失败');
      }

      toast({
        title: "保存成功",
        description: "文章信息已保存",
      });

      setOpenDialog(false);
      fetchArticles(); // 刷新列表
    } catch (error) {
      console.error('保存文章失败:', error);
      toast({
        variant: "destructive",
        title: "保存失败",
        description: error instanceof Error ? error.message : "操作失败，请重试",
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/platform/article/${deleteId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('删除失败');
      }

      toast({
        title: "删除成功",
        description: "文章已删除"
      });

      fetchArticles(); // 刷新列表
    } catch (error) {
      console.error('删除文章失败:', error);
      toast({
        variant: "destructive",
        title: "删除失败",
        description: error instanceof Error ? error.message : "操作失败，请重试"
      });
    } finally {
      setDeleteId(null);
    }
  };

  // 切换文章状态
  const toggleStatus = async (id: number, currentStatus: number) => {
    try {
      const newStatus = currentStatus === 0 ? 1 : 0;
      
      const response = await fetch(`/api/platform/article/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_hidden: newStatus
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '更新状态失败');
      }

      // 更新本地状态
      setArticles(articles.map(article => 
        article.id === id 
          ? { ...article, is_hidden: newStatus }
          : article
      ));

      toast({
        title: "更新成功",
        description: `文章已${newStatus === 1 ? '隐藏' : '显示'}`
      });
    } catch (error) {
      console.error('更新文章状态失败:', error);
      toast({
        variant: "destructive",
        title: "更新失败",
        description: error instanceof Error ? error.message : "操作失败，请重试"
      });
    }
  };

  // 切换置顶状态
  const toggleTop = async (id: number, currentStatus: number) => {
    try {
      const newStatus = currentStatus === 0 ? 1 : 0;
      
      const response = await fetch(`/api/platform/article/${id}/top`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_top: newStatus
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '更新置顶状态失败');
      }

      // 更新本地状态
      setArticles(articles.map(article => 
        article.id === id 
          ? { ...article, is_top: newStatus }
          : article
      ));

      toast({
        title: "更新成功",
        description: `文章已${newStatus === 1 ? '置顶' : '取消置顶'}`
      });
    } catch (error) {
      console.error('更新文章置顶状态失败:', error);
      toast({
        variant: "destructive",
        title: "更新失败",
        description: error instanceof Error ? error.message : "操作失败，请重试"
      });
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">资讯管理</h2>
        <div className="flex gap-2">
          <Button onClick={() => router.push('/platform/news/add')}>
            <PlusCircle className="h-4 w-4 mr-2" />
            新增文章
          </Button>
          <Button 
            variant="outline"
            onClick={() => setOpenCollectDialog(true)}
          >
            <Download className="h-4 w-4 mr-2" />
            采集文章
          </Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">封面</TableHead>
              <TableHead>标题</TableHead>
              <TableHead>摘要</TableHead>
              <TableHead>浏览次数</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>发布时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {articles.map((article) => (
              <TableRow key={article.id}>
                <TableCell>
                  <div className="w-[80px] h-[40px] relative">
                    <img 
                      src={article.cover_url} 
                      alt={article.title}
                      className="absolute inset-0 w-full h-full object-cover rounded"
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {article.is_top === 1 && (
                      <ArrowUp className="h-4 w-4 text-orange-500" />
                    )}
                    {article.title}
                  </div>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">{article.summary}</TableCell>
                <TableCell>{article.views}</TableCell>
                <TableCell>
                  {article.is_hidden === 0 ? (
                    <span className="text-green-600">显示</span>
                  ) : (
                    <span className="text-gray-400">隐藏</span>
                  )}
                </TableCell>
                <TableCell>
                  {new Date(article.created_at).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => router.push(`/platform/news/edit?id=${article.id}`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => toggleStatus(article.id, article.is_hidden)}
                    >
                      {article.is_hidden === 0 ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => toggleTop(article.id, article.is_top)}
                    >
                      <ArrowUp className={cn("h-4 w-4", article.is_top === 1 && "text-orange-500")} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDelete(article.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <ArticleDialog 
        open={openDialog}
        onOpenChange={setOpenDialog}
        onSubmit={handleSubmit}
        initialData={editingArticle}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="确认删除"
        description="确定要删除这篇文章吗？此操作无法撤销。"
        onConfirm={confirmDelete}
      />

      <CollectDialog 
        open={openCollectDialog}
        onOpenChange={setOpenCollectDialog}
      />
    </div>
  );
} 