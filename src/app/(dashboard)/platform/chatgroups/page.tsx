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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PlusCircle, Pencil, Trash2, MoveUp, MoveDown } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface ChatGroup {
  id: number;
  name: string;
  qrcode_image: string | null;
  display_order: number;
  is_active: number;
  description: string | null;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export default function ChatGroupsPage() {
  const { toast } = useToast();
  const [chatGroups, setChatGroups] = useState<ChatGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [currentGroup, setCurrentGroup] = useState<Partial<ChatGroup>>({
    name: '',
    qrcode_image: '',
    display_order: 0,
    description: '',
    member_count: 0,
    is_active: 1
  });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // 获取群聊列表
  const fetchChatGroups = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/platform/chatgroups');
      const result = await response.json();
      
      if (response.ok) {
        setChatGroups(result.data || []);
      } else {
        throw new Error(result.error || '获取群聊列表失败');
      }
    } catch (error) {
      console.error('获取群聊列表失败:', error);
      toast({
        variant: "destructive",
        title: "获取失败",
        description: error instanceof Error ? error.message : "获取群聊列表失败"
      });
    } finally {
      setLoading(false);
    }
  };

  // 首次加载时获取数据
  useEffect(() => {
    fetchChatGroups();
  }, []);

  // 添加群聊
  const handleAdd = () => {
    setCurrentGroup({
      name: '',
      qrcode_image: '',
      display_order: chatGroups.length + 1,
      description: '',
      member_count: 0,
      is_active: 1
    });
    setImagePreview(null);
    setDialogMode('add');
    setOpenDialog(true);
  };

  // 编辑群聊
  const handleEdit = (group: ChatGroup) => {
    setCurrentGroup(group);
    setImagePreview(group.qrcode_image);
    setDialogMode('edit');
    setOpenDialog(true);
  };

  // 删除群聊
  const handleDelete = (id: number) => {
    setDeleteId(id);
  };

  // 确认删除
  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/platform/chatgroups/${deleteId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '删除失败');
      }

      toast({
        title: "删除成功",
        description: "群聊已删除"
      });

      // 刷新列表
      fetchChatGroups();
    } catch (error) {
      console.error('删除群聊失败:', error);
      toast({
        variant: "destructive",
        title: "删除失败",
        description: error instanceof Error ? error.message : "删除群聊失败，请重试"
      });
    } finally {
      setDeleteId(null);
    }
  };

  // 处理图片上传
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 文件大小限制 (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "图片过大",
        description: "图片大小不能超过2MB"
      });
      return;
    }

    try {
      // 创建FormData对象并添加文件
      const formData = new FormData();
      formData.append('file', file);

      // 发送到上传API
      const response = await fetch('/api/platform/chatgroups/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '上传图片失败');
      }

      // 设置图片URL和预览
      setImagePreview(result.url);
      setCurrentGroup(prev => ({
        ...prev,
        qrcode_image: result.url
      }));

      toast({
        title: "上传成功",
        description: "二维码图片已上传"
      });
    } catch (error) {
      console.error('上传图片失败:', error);
      toast({
        variant: "destructive",
        title: "上传失败",
        description: error instanceof Error ? error.message : "上传图片失败，请重试"
      });
    }
  };

  // 表单提交
  const handleSubmit = async () => {
    try {
      if (!currentGroup.name) {
        toast({
          variant: "destructive",
          title: "提交失败",
          description: "群聊名称不能为空"
        });
        return;
      }

      const method = dialogMode === 'add' ? 'POST' : 'PUT';
      const url = dialogMode === 'add' 
        ? '/api/platform/chatgroups' 
        : `/api/platform/chatgroups/${currentGroup.id}`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(currentGroup)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '保存失败');
      }

      toast({
        title: "保存成功",
        description: `群聊已${dialogMode === 'add' ? '添加' : '更新'}`
      });

      setOpenDialog(false);
      fetchChatGroups();
    } catch (error) {
      console.error('保存群聊失败:', error);
      toast({
        variant: "destructive",
        title: "保存失败",
        description: error instanceof Error ? error.message : "保存群聊失败，请重试"
      });
    }
  };

  // 调整显示顺序
  const adjustOrder = async (id: number, direction: 'up' | 'down') => {
    try {
      const response = await fetch(`/api/platform/chatgroups/${id}/order`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ direction })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '调整顺序失败');
      }

      toast({
        title: "调整成功",
        description: "显示顺序已更新"
      });

      // 刷新列表
      fetchChatGroups();
    } catch (error) {
      console.error('调整显示顺序失败:', error);
      toast({
        variant: "destructive",
        title: "调整失败",
        description: error instanceof Error ? error.message : "调整显示顺序失败，请重试"
      });
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">群聊管理</h2>
        <Button onClick={handleAdd}>
          <PlusCircle className="h-4 w-4 mr-2" />
          新增群聊
        </Button>
      </div>

      {/* 移动端卡片布局 */}
      <div className="lg:hidden space-y-4">
        {loading ? (
          <Card className="p-6 text-center">
            加载中...
          </Card>
        ) : chatGroups.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            暂无群聊数据
          </Card>
        ) : (
          chatGroups.map((group) => (
            <Card key={group.id} className="p-4">
              <div className="flex gap-3">
                {/* 二维码图片 */}
                <div className="w-16 h-16 flex-shrink-0">
                  {group.qrcode_image ? (
                    <img 
                      src={group.qrcode_image} 
                      alt={`${group.name}二维码`} 
                      className="w-full h-full object-cover rounded-md"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 rounded-md flex items-center justify-center">
                      <span className="text-xs text-gray-400">无二维码</span>
                    </div>
                  )}
                </div>
                
                {/* 内容区域 */}
                <div className="flex-1 min-w-0">
                  {/* 群聊名称和状态 */}
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium truncate">{group.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs ml-2 ${
                      group.is_active === 1 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {group.is_active === 1 ? '启用' : '停用'}
                    </span>
                  </div>
                  
                  {/* 详细信息 */}
                  <div className="space-y-1 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-4">
                      <span>序号: {group.display_order}</span>
                      <span>成员: {group.member_count || 0}人</span>
                    </div>
                    <div>
                      创建时间: {new Date(group.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  {/* 操作按钮 */}
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleEdit(group)}
                    >
                      编辑
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => adjustOrder(group.id, 'up')}
                    >
                      上移
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => adjustOrder(group.id, 'down')}
                    >
                      下移
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-7 text-xs text-red-600"
                      onClick={() => handleDelete(group.id)}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* 桌面端表格布局 */}
      <Card className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">序号</TableHead>
              <TableHead>群聊名称</TableHead>
              <TableHead className="w-[120px]">二维码</TableHead>
              <TableHead className="w-[100px]">成员数量</TableHead>
              <TableHead className="w-[100px]">状态</TableHead>
              <TableHead className="w-[180px]">创建时间</TableHead>
              <TableHead className="text-right w-[220px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10">
                  加载中...
                </TableCell>
              </TableRow>
            ) : chatGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  暂无群聊数据
                </TableCell>
              </TableRow>
            ) : (
              chatGroups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell>{group.display_order}</TableCell>
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell>
                    {group.qrcode_image ? (
                      <div className="w-20 h-20 relative">
                        <img 
                          src={group.qrcode_image} 
                          alt={`${group.name}二维码`} 
                          className="w-full h-full object-cover rounded-md"
                        />
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">无二维码</span>
                    )}
                  </TableCell>
                  <TableCell>{group.member_count || 0}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      group.is_active === 1 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {group.is_active === 1 ? '启用' : '停用'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {new Date(group.created_at).toLocaleString('zh-CN', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => adjustOrder(group.id, 'up')}
                        disabled={group.display_order === 1}
                      >
                        <MoveUp className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => adjustOrder(group.id, 'down')}
                        disabled={group.display_order === chatGroups.length}
                      >
                        <MoveDown className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEdit(group)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDelete(group.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* 添加/编辑对话框 */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="w-[95%] max-w-[500px] mx-auto">
          <DialogHeader>
            <DialogTitle>{dialogMode === 'add' ? '新增群聊' : '编辑群聊'}</DialogTitle>
            <DialogDescription>
              请填写群聊信息，带 * 的字段为必填项
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                名称 *
              </Label>
              <Input
                id="name"
                value={currentGroup.name || ''}
                onChange={(e) => setCurrentGroup({ ...currentGroup, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="member_count" className="text-right">
                成员数量
              </Label>
              <Input
                id="member_count"
                type="number"
                value={currentGroup.member_count || 0}
                onChange={(e) => setCurrentGroup({ ...currentGroup, member_count: parseInt(e.target.value) || 0 })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                描述
              </Label>
              <Input
                id="description"
                value={currentGroup.description || ''}
                onChange={(e) => setCurrentGroup({ ...currentGroup, description: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="is_active" className="text-right">
                状态
              </Label>
              <select
                id="is_active"
                value={currentGroup.is_active}
                onChange={(e) => setCurrentGroup({ ...currentGroup, is_active: parseInt(e.target.value) })}
                className="col-span-3 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value={1}>启用</option>
                <option value={0}>停用</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="display_order" className="text-right">
                显示顺序
              </Label>
              <Input
                id="display_order"
                type="number"
                value={currentGroup.display_order || 0}
                onChange={(e) => setCurrentGroup({ ...currentGroup, display_order: parseInt(e.target.value) || 0 })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="qrcode" className="text-right pt-2">
                二维码
              </Label>
              <div className="col-span-3">
                <Input
                  id="qrcode"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="mb-2"
                />
                {imagePreview && (
                  <div className="mt-2 w-24 h-24 relative">
                    <img 
                      src={imagePreview} 
                      alt="二维码预览" 
                      className="w-full h-full object-cover rounded-md"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
        title="确认删除"
        description="您确定要删除这个群聊吗？此操作无法撤销。"
        onConfirm={confirmDelete}
      />
    </div>
  );
} 