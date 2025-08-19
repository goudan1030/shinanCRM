'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useState } from 'react';
import { Plus, Download, Upload, Trash2, Edit } from 'lucide-react';

interface Version {
  id: string;
  version: string;
  buildNumber: string;
  releaseDate: string;
  description: string;
  downloadUrl: string;
  isForced: boolean;
  isActive: boolean;
  platform: 'ios' | 'android';
}

export default function AppVersionPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // 模拟版本数据
  const [versions, setVersions] = useState<Version[]>([
    {
      id: '1',
      version: '1.0.0',
      buildNumber: '100',
      releaseDate: '2024-01-15',
      description: '初始版本发布，包含基础功能',
      downloadUrl: 'https://example.com/app-v1.0.0.apk',
      isForced: false,
      isActive: true,
      platform: 'android'
    },
    {
      id: '2',
      version: '1.1.0',
      buildNumber: '110',
      releaseDate: '2024-01-20',
      description: '修复已知问题，优化用户体验',
      downloadUrl: 'https://example.com/app-v1.1.0.apk',
      isForced: true,
      isActive: true,
      platform: 'android'
    }
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVersion, setEditingVersion] = useState<Version | null>(null);
  
  const [formData, setFormData] = useState({
    version: '',
    buildNumber: '',
    description: '',
    downloadUrl: '',
    isForced: false,
    platform: 'android' as 'ios' | 'android'
  });

  const handleAddVersion = () => {
    if (!formData.version || !formData.buildNumber) {
      toast({
        variant: 'destructive',
        title: '请填写必填字段',
        description: '版本号和构建号不能为空',
      });
      return;
    }

    const newVersion: Version = {
      id: Date.now().toString(),
      version: formData.version,
      buildNumber: formData.buildNumber,
      releaseDate: new Date().toISOString().split('T')[0],
      description: formData.description,
      downloadUrl: formData.downloadUrl,
      isForced: formData.isForced,
      isActive: true,
      platform: formData.platform
    };

    setVersions(prev => [newVersion, ...prev]);
    setFormData({
      version: '',
      buildNumber: '',
      description: '',
      downloadUrl: '',
      isForced: false,
      platform: 'android'
    });
    setShowAddForm(false);
    
    toast({
      title: '版本添加成功',
      description: `已添加版本 ${formData.version}`,
    });
  };

  const handleEditVersion = (version: Version) => {
    setEditingVersion(version);
    setFormData({
      version: version.version,
      buildNumber: version.buildNumber,
      description: version.description,
      downloadUrl: version.downloadUrl,
      isForced: version.isForced,
      platform: version.platform
    });
    setShowAddForm(true);
  };

  const handleUpdateVersion = () => {
    if (!editingVersion) return;

    setVersions(prev => prev.map(v => 
      v.id === editingVersion.id 
        ? { ...v, ...formData }
        : v
    ));

    setFormData({
      version: '',
      buildNumber: '',
      description: '',
      downloadUrl: '',
      isForced: false,
      platform: 'android'
    });
    setEditingVersion(null);
    setShowAddForm(false);
    
    toast({
      title: '版本更新成功',
      description: `已更新版本 ${formData.version}`,
    });
  };

  const handleDeleteVersion = (id: string) => {
    setVersions(prev => prev.filter(v => v.id !== id));
    toast({
      title: '版本删除成功',
      description: '版本已从列表中移除',
    });
  };

  const handleToggleActive = (id: string) => {
    setVersions(prev => prev.map(v => 
      v.id === id 
        ? { ...v, isActive: !v.isActive }
        : v
    ));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">APP版本管理</h1>
          <p className="text-muted-foreground">
            管理移动端应用的版本发布和更新
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          添加版本
        </Button>
      </div>

      {/* 添加/编辑版本表单 */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingVersion ? '编辑版本' : '添加新版本'}
            </CardTitle>
            <CardDescription>
              {editingVersion ? '修改版本信息' : '创建新的应用版本'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="version">版本号 *</Label>
                <Input
                  id="version"
                  value={formData.version}
                  onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                  placeholder="例如: 1.0.0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buildNumber">构建号 *</Label>
                <Input
                  id="buildNumber"
                  value={formData.buildNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, buildNumber: e.target.value }))}
                  placeholder="例如: 100"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">版本描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="描述此版本的更新内容"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="downloadUrl">下载地址</Label>
              <Input
                id="downloadUrl"
                value={formData.downloadUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, downloadUrl: e.target.value }))}
                placeholder="https://example.com/app.apk"
              />
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isForced"
                  checked={formData.isForced}
                  onChange={(e) => setFormData(prev => ({ ...prev, isForced: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="isForced">强制更新</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Label>平台:</Label>
                <select
                  value={formData.platform}
                  onChange={(e) => setFormData(prev => ({ ...prev, platform: e.target.value as 'ios' | 'android' }))}
                  className="border rounded px-2 py-1"
                >
                  <option value="android">Android</option>
                  <option value="ios">iOS</option>
                </select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                onClick={editingVersion ? handleUpdateVersion : handleAddVersion}
                disabled={isLoading}
              >
                {editingVersion ? '更新版本' : '添加版本'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAddForm(false);
                  setEditingVersion(null);
                  setFormData({
                    version: '',
                    buildNumber: '',
                    description: '',
                    downloadUrl: '',
                    isForced: false,
                    platform: 'android'
                  });
                }}
              >
                取消
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 版本列表 */}
      <div className="grid gap-4">
        {versions.map((version) => (
          <Card key={version.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold">v{version.version}</h3>
                    <Badge variant={version.isActive ? 'default' : 'secondary'}>
                      {version.isActive ? '活跃' : '非活跃'}
                    </Badge>
                    {version.isForced && (
                      <Badge variant="destructive">强制更新</Badge>
                    )}
                    <Badge variant="outline">{version.platform}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    构建号: {version.buildNumber} | 发布日期: {version.releaseDate}
                  </p>
                  <p className="text-sm">{version.description}</p>
                  {version.downloadUrl && (
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Download className="mr-1 h-3 w-3" />
                        下载
                      </Button>
                      <span className="text-xs text-muted-foreground">{version.downloadUrl}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(version.id)}
                  >
                    {version.isActive ? '停用' : '启用'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditVersion(version)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteVersion(version.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {versions.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">暂无版本信息</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              添加第一个版本
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
