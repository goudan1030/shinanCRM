'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Contract, CONTRACT_STATUS_MAP, CONTRACT_TYPE_MAP } from '@/types/contract';
import { 
  ArrowLeft, 
  Copy, 
  Download, 
  ExternalLink, 
  FileText, 
  Calendar,
  User,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import Link from 'next/link';

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [signUrl, setSignUrl] = useState('');

  const contractId = params.id as string;

  useEffect(() => {
    if (contractId) {
      fetchContract();
    }
  }, [contractId]);

  const fetchContract = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/contracts/${contractId}`);
      const data = await response.json();

      if (response.ok) {
        setContract(data);
        // 生成签署链接
        setSignUrl(`${window.location.origin}/contracts/sign?id=${contractId}`);
      } else {
        toast({
          title: '获取合同失败',
          description: data.error || '请稍后重试',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('获取合同失败:', error);
      toast({
        title: '获取合同失败',
        description: '网络错误，请稍后重试',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const copySignUrl = () => {
    navigator.clipboard.writeText(signUrl);
    toast({
      title: '复制成功',
      description: '签署链接已复制到剪贴板',
    });
  };

  const downloadPDF = async () => {
    try {
      const response = await fetch(`/api/contracts/${contractId}/pdf`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${contract?.contract_number || 'contract'}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        toast({
          title: '下载失败',
          description: 'PDF生成失败，请稍后重试',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('下载PDF失败:', error);
      toast({
        title: '下载失败',
        description: '网络错误，请稍后重试',
        variant: 'destructive'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'SIGNED': return 'bg-green-100 text-green-800';
      case 'EXPIRED': return 'bg-red-100 text-red-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">加载中...</div>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <FileText className="h-8 w-8 mb-2" />
          <p>合同不存在或已过期</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/contracts/list">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回合同列表
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold text-gray-900">合同详情</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 合同信息 */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">{contract.contract_number}</CardTitle>
                  <p className="text-gray-600 mt-1">{contract.template?.name || '合同模板'}</p>
                </div>
                <Badge className={getStatusColor(contract.status)}>
                  {CONTRACT_STATUS_MAP[contract.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">合同类型</label>
                    <p className="text-sm">{CONTRACT_TYPE_MAP[contract.contract_type]}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">创建时间</label>
                    <p className="text-sm">{new Date(contract.created_at).toLocaleString('zh-CN')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">签署时间</label>
                    <p className="text-sm">
                      {contract.signed_at 
                        ? new Date(contract.signed_at).toLocaleString('zh-CN')
                        : '未签署'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">过期时间</label>
                    <p className="text-sm">
                      {contract.expires_at 
                        ? new Date(contract.expires_at).toLocaleString('zh-CN')
                        : '无限制'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 合同内容 */}
          <Card>
            <CardHeader>
              <CardTitle>合同内容</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: contract.content }}
              />
            </CardContent>
          </Card>
        </div>

        {/* 侧边栏 */}
        <div className="space-y-6">
          {/* 会员信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                会员信息
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">会员姓名</label>
                  <p className="text-sm">{contract.member?.name || '未设置'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">会员编号</label>
                  <p className="text-sm">{contract.member?.member_no || '无'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">手机号</label>
                  <p className="text-sm">{contract.member?.phone || '未设置'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">身份证</label>
                  <p className="text-sm">{contract.member?.id_card || '未设置'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 操作区域 */}
          <Card>
            <CardHeader>
              <CardTitle>操作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {contract.status === 'PENDING' && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-500 mb-2 block">签署链接</label>
                    <div className="flex gap-2">
                      <Input 
                        value={signUrl} 
                        readOnly 
                        className="text-xs"
                      />
                      <Button size="sm" onClick={copySignUrl}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      复制此链接发送给客户进行签署
                    </p>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    asChild
                  >
                    <Link href={`/contracts/sign?id=${contractId}`}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      前往签署
                    </Link>
                  </Button>
                </>
              )}

              {contract.status === 'SIGNED' && (
                <Button 
                  className="w-full" 
                  onClick={downloadPDF}
                >
                  <Download className="h-4 w-4 mr-2" />
                  下载PDF
                </Button>
              )}

              <Button 
                variant="outline" 
                className="w-full"
                asChild
              >
                <Link href="/contracts/list">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  返回列表
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* 状态信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                状态信息
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {contract.status === 'SIGNED' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm">
                    {contract.status === 'SIGNED' ? '已签署' : '待签署'}
                  </span>
                </div>
                
                {contract.expires_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      过期时间: {new Date(contract.expires_at).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}