'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { ContractTemplate, CONTRACT_TYPE_MAP } from '@/types/contract';
import { Plus, Edit, Eye, Trash2, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ContractTemplatesPage() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'MEMBERSHIP',
    template_content: '',
    variables_schema: '{}',
    is_active: true
  });

  // 获取模板列表
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/contracts/templates');
      const data = await response.json();

      if (response.ok) {
        setTemplates(data);
      } else {
        toast({
          title: '获取模板列表失败',
          description: data.error || '请稍后重试',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('获取模板列表失败:', error);
      toast({
        title: '获取模板列表失败',
        description: '网络错误，请稍后重试',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/contracts/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          variables_schema: JSON.parse(formData.variables_schema)
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: '模板保存成功',
          description: '合同模板已保存',
        });
        setIsDialogOpen(false);
        resetForm();
        fetchTemplates();
      } else {
        toast({
          title: '保存失败',
          description: data.error || '请稍后重试',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('保存模板失败:', error);
      toast({
        title: '保存失败',
        description: '网络错误，请稍后重试',
        variant: 'destructive'
      });
    }
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      template_content: '',
      variables_schema: '{}',
      is_active: true
    });
    setEditingTemplate(null);
  };

  // 编辑模板
  const handleEdit = (template: ContractTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      template_content: template.template_content,
      variables_schema: JSON.stringify(template.variables_schema, null, 2),
      is_active: template.is_active
    });
    setIsDialogOpen(true);
  };

  // 预览模板
  const handlePreview = (template: ContractTemplate) => {
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.write(template.template_content);
      previewWindow.document.close();
    }
  };

  // 删除模板
  const handleDelete = async (templateId: number) => {
    if (!confirm('确定要删除这个模板吗？')) return;

    try {
      const response = await fetch(`/api/contracts/templates/${templateId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: '删除成功',
          description: '模板已删除',
        });
        fetchTemplates();
      } else {
        const data = await response.json();
        toast({
          title: '删除失败',
          description: data.error || '请稍后重试',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('删除模板失败:', error);
      toast({
        title: '删除失败',
        description: '网络错误，请稍后重试',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">合同模板管理</h1>
        <p className="text-gray-600">管理合同模板，支持HTML格式和变量替换</p>
      </div>

      {/* 操作按钮 */}
      <div className="mb-6">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              新建模板
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? '编辑模板' : '新建模板'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">模板名称</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="请输入模板名称"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type">合同类型</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择合同类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEMBERSHIP">会员服务</SelectItem>
                      <SelectItem value="ONE_TIME">一次性服务</SelectItem>
                      <SelectItem value="ANNUAL">年费服务</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="template_content">模板内容 (HTML)</Label>
                <Textarea
                  id="template_content"
                  value={formData.template_content}
                  onChange={(e) => setFormData(prev => ({ ...prev, template_content: e.target.value }))}
                  placeholder="请输入HTML模板内容，使用 {{变量名}} 进行变量替换"
                  rows={15}
                  required
                />
              </div>

              <div>
                <Label htmlFor="variables_schema">变量定义 (JSON)</Label>
                <Textarea
                  id="variables_schema"
                  value={formData.variables_schema}
                  onChange={(e) => setFormData(prev => ({ ...prev, variables_schema: e.target.value }))}
                  placeholder='{"变量名": "变量描述"}'
                  rows={5}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit">
                  {editingTemplate ? '更新' : '创建'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 模板列表 */}
      <Card>
        <CardHeader>
          <CardTitle>模板列表</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="text-gray-500">加载中...</div>
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <FileText className="h-8 w-8 mb-2" />
              <p>暂无模板数据</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>模板名称</TableHead>
                  <TableHead>合同类型</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      {template.name}
                    </TableCell>
                    <TableCell>
                      {CONTRACT_TYPE_MAP[template.type]}
                    </TableCell>
                    <TableCell>
                      <Badge className={template.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {template.is_active ? '启用' : '禁用'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(template.created_at).toLocaleString('zh-CN')}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreview(template)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(template.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
