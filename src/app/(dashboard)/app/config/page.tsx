'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { useState } from 'react';
import { Settings, Save, RefreshCw } from 'lucide-react';

export default function AppConfigPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // 表单状态
  const [formData, setFormData] = useState({
    appName: '新星CRM',
    appVersion: '1.0.0',
    appDescription: '客户关系管理系统移动端应用',
    apiBaseUrl: 'https://api.xinghun.info',
    isEnabled: true,
    maintenanceMode: false,
    maintenanceMessage: '系统维护中，请稍后再试'
  });

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // TODO: 实现保存逻辑
      await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟API调用
      
      toast({
        title: '保存成功',
        description: 'APP配置已更新',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '保存失败',
        description: '请重试',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      appName: '新星CRM',
      appVersion: '1.0.0',
      appDescription: '客户关系管理系统移动端应用',
      apiBaseUrl: 'https://api.xinghun.info',
      isEnabled: true,
      maintenanceMode: false,
      maintenanceMessage: '系统维护中，请稍后再试'
    });
    
    toast({
      title: '已重置',
      description: '配置已恢复到默认值',
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">APP基础配置</h1>
          <p className="text-muted-foreground">
            配置移动端应用的基本信息和API设置
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleReset} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            重置
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? '保存中...' : '保存配置'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              基本信息
            </CardTitle>
            <CardDescription>
              配置应用的基本信息和版本
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="appName">应用名称</Label>
                <Input
                  id="appName"
                  value={formData.appName}
                  onChange={(e) => setFormData(prev => ({ ...prev, appName: e.target.value }))}
                  placeholder="请输入应用名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appVersion">应用版本</Label>
                <Input
                  id="appVersion"
                  value={formData.appVersion}
                  onChange={(e) => setFormData(prev => ({ ...prev, appVersion: e.target.value }))}
                  placeholder="例如: 1.0.0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="appDescription">应用描述</Label>
              <Textarea
                id="appDescription"
                value={formData.appDescription}
                onChange={(e) => setFormData(prev => ({ ...prev, appDescription: e.target.value }))}
                placeholder="请输入应用描述"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* API配置 */}
        <Card>
          <CardHeader>
            <CardTitle>API配置</CardTitle>
            <CardDescription>
              配置应用与后端API的连接设置
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiBaseUrl">API基础地址</Label>
              <Input
                id="apiBaseUrl"
                value={formData.apiBaseUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, apiBaseUrl: e.target.value }))}
                placeholder="https://api.example.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* 系统状态 */}
        <Card>
          <CardHeader>
            <CardTitle>系统状态</CardTitle>
            <CardDescription>
              控制应用的启用状态和维护模式
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>启用应用</Label>
                <p className="text-sm text-muted-foreground">
                  控制应用是否可用
                </p>
              </div>
              <Switch
                checked={formData.isEnabled}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isEnabled: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>维护模式</Label>
                <p className="text-sm text-muted-foreground">
                  启用维护模式，暂停应用访问
                </p>
              </div>
              <Switch
                checked={formData.maintenanceMode}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, maintenanceMode: checked }))}
              />
            </div>
            {formData.maintenanceMode && (
              <div className="space-y-2">
                <Label htmlFor="maintenanceMessage">维护消息</Label>
                <Textarea
                  id="maintenanceMessage"
                  value={formData.maintenanceMessage}
                  onChange={(e) => setFormData(prev => ({ ...prev, maintenanceMessage: e.target.value }))}
                  placeholder="请输入维护提示信息"
                  rows={2}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
