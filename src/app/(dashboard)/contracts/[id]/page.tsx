'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Contract, CONTRACT_STATUS_MAP, CONTRACT_TYPE_MAP } from '@/types/contract';
import { ArrowLeft, Download, FileText, User, Calendar, Hash } from 'lucide-react';

export default function ContractDetailPage() {
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();
  const contractId = params.id as string;
  
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);

  // 获取合同详情
  const fetchContract = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/contracts/${contractId}`);
      const data = await response.json();

      if (response.ok) {
        setContract(data);
      } else {
        toast({
          title: '获取合同详情失败',
          description: data.error || '请稍后重试',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('获取合同详情失败:', error);
      toast({
        title: '获取合同详情失败',
        description: '网络错误，请稍后重试',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContract();
  }, [contractId]);

  // 下载PDF
  const handleDownloadPDF = () => {
    if (!contract) return;
    
    const link = document.createElement('a');
    link.href = `/api/contracts/${contract.id}/pdf`;
    link.download = `contract-${contract.contract_number}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 获取状态颜色
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
          <p>合同不存在</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 页面头部 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">合同详情</h1>
              <p className="text-gray-600">合同编号：{contract.contract_number}</p>
            </div>
          </div>
          
          {contract.status === 'SIGNED' && (
            <Button onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              下载PDF
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 合同信息 */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>合同信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Hash className="h-4 w-4 text-gray-400" />
                <div>
                  <label className="text-sm font-medium text-gray-500">合同编号</label>
                  <p className="text-sm font-mono">{contract.contract_number}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-gray-400" />
                <div>
                  <label className="text-sm font-medium text-gray-500">合同类型</label>
                  <p className="text-sm">{CONTRACT_TYPE_MAP[contract.contract_type]}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-400" />
                <div>
                  <label className="text-sm font-medium text-gray-500">会员信息</label>
                  <p className="text-sm">{contract.member?.name}</p>
                  <p className="text-xs text-gray-500">{contract.member?.member_no}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <div>
                  <label className="text-sm font-medium text-gray-500">创建时间</label>
                  <p className="text-sm">{new Date(contract.created_at).toLocaleString('zh-CN')}</p>
                </div>
              </div>
              
              {contract.signed_at && (
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <label className="text-sm font-medium text-gray-500">签署时间</label>
                    <p className="text-sm">{new Date(contract.signed_at).toLocaleString('zh-CN')}</p>
                  </div>
                </div>
              )}
              
              {contract.expires_at && (
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <label className="text-sm font-medium text-gray-500">过期时间</label>
                    <p className="text-sm">{new Date(contract.expires_at).toLocaleString('zh-CN')}</p>
                  </div>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-gray-500">合同状态</label>
                <div className="mt-1">
                  <Badge className={getStatusColor(contract.status)}>
                    {CONTRACT_STATUS_MAP[contract.status]}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 会员详细信息 */}
          {contract.member && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>会员信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">姓名</label>
                  <p className="text-sm">{contract.member.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">会员编号</label>
                  <p className="text-sm font-mono">{contract.member.member_no}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">手机号</label>
                  <p className="text-sm">{contract.member.phone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">身份证号</label>
                  <p className="text-sm font-mono">{contract.member.id_card}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 合同内容 */}
        <div className="lg:col-span-2">
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
      </div>
    </div>
  );
}
