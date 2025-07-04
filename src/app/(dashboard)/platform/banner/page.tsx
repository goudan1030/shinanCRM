'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { PlusCircle, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { BannerDialog } from '@/components/platform/banner-dialog';
import { useToast } from "@/components/ui/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { OptimizedImage } from '@/components/ui/optimized-image';
import dynamic from 'next/dynamic';

// 懒加载Dialog组件
const LazyBannerDialog = dynamic(
  () => import('@/components/platform/banner-dialog').then(mod => ({ default: mod.BannerDialog })),
  {
    loading: () => <div className="p-4 bg-slate-100 rounded-md">加载中...</div>,
    ssr: false
  }
);

// 分类映射
const CATEGORY_MAP = {
  1: '最新Banner',
  2: '热门Banner',
  3: '弹窗Banner'
} as const;

// 定义API响应类型
interface ApiResponse {
  success?: boolean;
  status?: string;
  data?: any;
  error?: string;
  message?: string;
}

export default function BannerPage() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [banners, setBanners] = useState<any[]>([]);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // 获取Banner列表
  const fetchBanners = async () => {
    try {
      const response = await fetch('/api/platform/banner');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json() as ApiResponse;
      console.log('API响应:', result); // 调试用，查看实际响应格式
      
      // 兼容不同的响应格式
      if (result.success === true || result.status === 'success') {
        console.log('Banner数据:', result.data); // 打印获取到的数据
        setBanners(result.data || []);
      } else {
        const errorMsg = result.error || result.message || "获取Banner列表失败";
        console.error('获取Banner列表失败:', errorMsg);
        toast({
          variant: "destructive",
          title: "获取失败",
          description: errorMsg
        });
      }
    } catch (error) {
      console.error('获取Banner列表失败:', error);
      toast({
        variant: "destructive",
        title: "获取失败",
        description: error instanceof Error ? error.message : "网络错误，请稍后重试"
      });
    }
  };

  // 切换Banner状态
  const toggleStatus = async (id: number, currentStatus: number) => {
    try {
      const newStatus = currentStatus === 1 ? 0 : 1;
      
      const response = await fetch(`/api/platform/banner/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus  // 确保发送的是数字类型
        })
      });

      const result = await response.json() as ApiResponse;

      if (result.success !== true && result.status !== 'success') {
        throw new Error(result.error || result.message || '更新状态失败');
      }

      // 更新本地状态
      setBanners(banners.map(banner => 
        banner.id === id 
          ? { ...banner, status: newStatus }
          : banner
      ));

      toast({
        title: "更新成功",
        description: `Banner已${currentStatus === 1 ? '隐藏' : '显示'}`
      });
    } catch (error) {
      console.error('更新Banner状态失败:', error);
      toast({
        variant: "destructive",
        title: "更新失败",
        description: error instanceof Error ? error.message : "操作失败，请重试"
      });
    }
  };

  // 删除Banner
  const handleDelete = async (id: number) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/platform/banner/${deleteId}`, {
        method: 'DELETE'
      });

      const result = await response.json() as ApiResponse;

      if (result.success !== true && result.status !== 'success') {
        throw new Error(result.error || result.message || '删除失败');
      }

      toast({
        title: "删除成功",
        description: "Banner已删除"
      });

      fetchBanners(); // 刷新列表
    } catch (error) {
      console.error('删除Banner失败:', error);
      toast({
        variant: "destructive",
        title: "删除失败",
        description: error instanceof Error ? error.message : "操作失败，请重试"
      });
    } finally {
      setDeleteId(null);
    }
  };

  // 编辑Banner
  const handleEdit = (banner: any) => {
    setEditingBanner(banner);
    setOpenDialog(true);
  };

  // 初始加载
  useEffect(() => {
    fetchBanners();
  }, []);

  const handleSubmit = async (data: any) => {
    try {
      const response = await fetch('/api/platform/banner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.status !== 'success') {
        throw new Error(result.error || '提交失败');
      }

      toast({
        title: "保存成功",
        description: result.message || "Banner信息已保存",
      });

      setOpenDialog(false);
      fetchBanners(); // 刷新列表

    } catch (error) {
      console.error('保存Banner失败:', error);
      toast({
        variant: "destructive",
        title: "保存失败",
        description: error instanceof Error ? error.message : "操作失败，请重试",
      });
    }
  };

  // 添加过滤函数
  const filteredBanners = banners.filter(banner => {
    if (selectedCategory === 'all') return true;
    
    // 将分类值映射回数字ID
    const categoryIdMap = {
      'home': 1,      // 最新
      'activity': 2,  // 热门
      'popup': 3      // 弹窗
    };
    
    return banner.category_id === categoryIdMap[selectedCategory as keyof typeof categoryIdMap];
  });

  return (
    <div className="p-3">
      {/* 标题和操作按钮 - 移动端垂直排列 */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold">Banner管理</h2>
        <Button onClick={() => setOpenDialog(true)} className="w-full sm:w-auto">
          <PlusCircle className="h-4 w-4 mr-2" />
          新增Banner
        </Button>
      </div>

      {/* 筛选区域 - 移动端垂直排列 */}
      <Card className="p-3 sm:p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="w-full sm:w-[200px]">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                <SelectItem value="home">最新Banner</SelectItem>
                <SelectItem value="activity">热门Banner</SelectItem>
                <SelectItem value="popup">弹窗Banner</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Select defaultValue="all">
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="1">显示</SelectItem>
              <SelectItem value="0">隐藏</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* 表格区域 - 桌面端显示表格，移动端显示卡片列表 */}
      <Card className="overflow-hidden">
        {/* 桌面端表格 */}
        <div className="hidden lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">缩略图</TableHead>
                <TableHead>标题</TableHead>
                <TableHead>所属分类</TableHead>
                <TableHead>排序</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>展示时间</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBanners.map((banner) => (
                <TableRow key={banner.id}>
                  <TableCell>
                    <div className="w-[80px] h-[40px] relative">
                      {banner.image_url?.startsWith('data:') ? (
                        <img 
                          src={banner.image_url} 
                          alt={banner.title}
                          className="absolute inset-0 w-full h-full object-cover rounded"
                        />
                      ) : (
                      <OptimizedImage 
                        src={banner.image_url} 
                        alt={banner.title}
                        width={80}
                        height={40}
                        className="absolute inset-0 w-full h-full object-cover rounded"
                      />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{banner.title}</TableCell>
                  <TableCell>{CATEGORY_MAP[banner.category_id as keyof typeof CATEGORY_MAP]}</TableCell>
                  <TableCell>{banner.sort_order}</TableCell>
                  <TableCell>
                    {banner.status === 1 ? (
                      <span className="text-green-600">显示</span>
                    ) : (
                      <span className="text-gray-400">隐藏</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {banner.start_time ? (
                      <div className="text-sm">
                        <div>{new Date(banner.start_time).toLocaleDateString()}</div>
                        <div>{new Date(banner.end_time).toLocaleDateString()}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(banner.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEdit(banner)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => toggleStatus(banner.id, banner.status)}
                      >
                        {banner.status === 1 ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDelete(banner.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* 移动端卡片列表 */}
        <div className="lg:hidden space-y-4 p-4">
          {filteredBanners.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              暂无Banner数据
            </div>
          ) : (
            filteredBanners.map((banner) => (
              <div key={banner.id} className="bg-white rounded-lg border p-4 shadow-sm">
                {/* Banner图片 - 全宽展示 */}
                <div className="w-full h-32 relative rounded overflow-hidden mb-3">
                  {banner.image_url?.startsWith('data:') ? (
                    <img 
                      src={banner.image_url} 
                      alt={banner.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <OptimizedImage 
                      src={banner.image_url} 
                      alt={banner.title}
                      width={400}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* Banner标题 - 换行展示 */}
                <h3 className="font-medium text-base mb-3 leading-relaxed">{banner.title}</h3>

                {/* 分类和状态标签 */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    {CATEGORY_MAP[banner.category_id as keyof typeof CATEGORY_MAP]}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    banner.status === 1 
                      ? "bg-green-100 text-green-800" 
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    {banner.status === 1 ? "显示" : "隐藏"}
                  </span>
                </div>

                {/* 卡片内容 */}
                <div className="space-y-2 text-sm mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">排序：</span>
                    <span>{banner.sort_order}</span>
                  </div>
                  {banner.start_time && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">展示时间：</span>
                      <span className="text-right">
                        {new Date(banner.start_time).toLocaleDateString()} - {new Date(banner.end_time).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">创建时间：</span>
                    <span>{new Date(banner.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* 卡片操作按钮 */}
                <div className="flex gap-2 pt-3 border-t">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={() => handleEdit(banner)}
                  >
                    编辑
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={() => toggleStatus(banner.id, banner.status)}
                  >
                    {banner.status === 1 ? "隐藏" : "显示"}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1 h-8 text-xs text-red-600"
                    onClick={() => handleDelete(banner.id)}
                  >
                    删除
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <LazyBannerDialog 
        open={openDialog}
        onOpenChange={setOpenDialog}
        onSubmit={handleSubmit}
        initialData={editingBanner}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="确认删除"
        description="确定要删除这个Banner吗？此操作无法撤销。"
        onConfirm={confirmDelete}
      />
    </div>
  );
} 