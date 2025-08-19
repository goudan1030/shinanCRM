'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Settings, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ConfigStatus {
  keyId: boolean;
  teamId: boolean;
  bundleId: boolean;
  privateKey: boolean;
  environment: boolean;
  overall: boolean;
}

export default function PushConfigPage() {
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const checkConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/messages/push/config-check');
      const result = await response.json();

      if (result.success) {
        setConfigStatus(result.data);
        toast({
          title: "配置检查完成",
          description: result.data.overall ? "所有配置项正常" : "部分配置项缺失",
        });
      } else {
        toast({
          title: "配置检查失败",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "配置检查失败",
        description: "网络错误，请稍后重试",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkConfig();
  }, []);

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusBadge = (status: boolean) => {
    return status ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        已配置
      </Badge>
    ) : (
      <Badge variant="destructive">
        未配置
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">推送配置</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>iOS推送通知配置</CardTitle>
          <CardDescription>
            检查Apple Push Notification Service (APNs) 配置状态
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">配置状态</span>
              <Button 
                onClick={checkConfig} 
                disabled={loading}
                size="sm"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    检查中...
                  </>
                ) : (
                  '重新检查'
                )}
              </Button>
            </div>

            {configStatus && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(configStatus.keyId)}
                    <span>Key ID</span>
                  </div>
                  {getStatusBadge(configStatus.keyId)}
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(configStatus.teamId)}
                    <span>Team ID</span>
                  </div>
                  {getStatusBadge(configStatus.teamId)}
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(configStatus.bundleId)}
                    <span>Bundle ID</span>
                  </div>
                  {getStatusBadge(configStatus.bundleId)}
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(configStatus.privateKey)}
                    <span>Private Key</span>
                  </div>
                  {getStatusBadge(configStatus.privateKey)}
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(configStatus.environment)}
                    <span>Environment</span>
                  </div>
                  {getStatusBadge(configStatus.environment)}
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(configStatus.overall)}
                    <span className="font-medium">总体状态</span>
                  </div>
                  {getStatusBadge(configStatus.overall)}
                </div>
              </div>
            )}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                推送功能需要正确配置APNs参数才能正常工作。请在环境变量中设置相关配置项。
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>配置说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Key ID</h4>
              <p className="text-gray-600">Apple Developer账户中的APNs密钥ID</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Team ID</h4>
              <p className="text-gray-600">Apple Developer账户的Team ID</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Bundle ID</h4>
              <p className="text-gray-600">iOS应用的Bundle Identifier</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Private Key</h4>
              <p className="text-gray-600">APNs密钥的私钥内容（P8格式）</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Environment</h4>
              <p className="text-gray-600">推送环境：development（开发）或 production（生产）</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
