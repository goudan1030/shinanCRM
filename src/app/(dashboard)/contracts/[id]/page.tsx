'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Copy, ExternalLink, Download, Mail } from 'lucide-react';
import Link from 'next/link';
import { CONTRACT_STATUS_MAP } from '@/types/contract';

interface Contract {
  id: number;
  contract_number: string;
  member_id: number;
  template_id: number;
  contract_type: string;
  content: string;
  variables: any;
  status: 'DRAFT' | 'PENDING' | 'SIGNED' | 'CANCELLED';
  created_at: string;
  updated_at: string;
  member?: {
    member_no: string;
    member_name: string;
    member_real_name?: string;
    member_phone: string;
    member_id_card: string;
  };
  template?: {
    name: string;
  };
}

export default function ContractDetailPage() {
  const params = useParams();
  const { toast } = useToast();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [signUrl, setSignUrl] = useState('');

  const contractId = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    if (contractId) {
      fetchContract();
      setSignUrl(`${window.location.origin}/contracts/sign?id=${contractId}`);
    }
  }, [contractId]);

  const fetchContract = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/contracts/${contractId}`);
      const data = await response.json();

      if (response.ok) {
        console.log('🔍 合同数据:', data);
        console.log('📄 合同内容:', data.content);
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

  const copySignUrl = () => {
    navigator.clipboard.writeText(signUrl);
    toast({
      title: '复制成功',
      description: '签署链接已复制到剪贴板'
    });
  };

  // 重新生成合同内容
  const handleRegenerateContract = async () => {
    if (!contract) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/contracts/${contract.id}/regenerate`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: '重新生成成功',
          description: '合同内容已重新生成并填充变量',
        });
        // 重新获取合同内容
        await fetchContract();
      } else {
        toast({
          title: '重新生成失败',
          description: data.error || '请稍后重试',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('重新生成合同失败:', error);
      toast({
        title: '重新生成失败',
        description: '网络错误，请稍后重试',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // 更新合同模板
  const handleUpdateTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/contracts/templates/update-seal', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: '模板更新成功',
          description: '已修复盖章位置并移除不必要的甲方信息',
        });
        
        // 如果当前合同存在，重新生成内容
        if (contract) {
          await handleRegenerateContract();
        }
      } else {
        toast({
          title: '模板更新失败',
          description: data.error || '请稍后重试',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('更新模板失败:', error);
      toast({
        title: '更新模板失败',
        description: '网络错误，请稍后重试',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'SIGNED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
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
          <h2 className="text-lg font-medium mb-2">合同不存在</h2>
          <p className="text-gray-600 mb-4">请检查合同ID是否正确</p>
          <Button asChild>
            <Link href="/contracts/list">返回合同列表</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pb-20 min-h-screen">
      {/* 合同样式 */}
      <style jsx global>{`
        .contract-preview {
          font-family: "Microsoft YaHei", Arial, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        
        .contract-preview .contract-header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
        }
        
        .contract-preview .contract-header h1 {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 10px;
          color: #000;
        }
        
        .contract-preview .contract-number {
          font-weight: bold;
          color: #666;
          margin: 8px 0;
        }
        
        .contract-preview .party-info {
          margin: 20px 0;
          padding: 15px;
          background-color: #f9f9f9;
          border-left: 4px solid #007bff;
          border-radius: 4px;
        }
        
        .contract-preview .party-info h3 {
          margin: 0 0 10px 0;
          font-size: 16px;
          font-weight: bold;
          color: #333;
        }
        
        .contract-preview .party-info p {
          margin: 5px 0;
          font-size: 14px;
        }
        
        .contract-preview .contract-clause {
          margin: 20px 0;
        }
        
        .contract-preview .contract-clause h3 {
          font-size: 16px;
          font-weight: bold;
          margin: 15px 0 10px 0;
          color: #333;
        }
        
        .contract-preview .contract-clause p {
          margin: 8px 0;
          font-size: 14px;
          line-height: 1.6;
        }
        
        .contract-preview .contract-clause ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        
        .contract-preview .contract-clause li {
          margin: 5px 0;
          font-size: 14px;
        }
        
        .contract-preview .signature-section {
          margin-top: 50px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        
        .contract-preview .signature-section > div {
          text-align: center;
          flex: 1;
        }
        
        .contract-preview .signature-section img {
          max-width: 120px;
          max-height: 120px;
          margin: 10px 0;
        }
        
        .contract-preview .signature-line {
          border-bottom: 1px solid #000;
          width: 200px;
          display: inline-block;
          margin-left: 10px;
          height: 20px;
        }
        
        .contract-preview strong {
          font-weight: bold;
          color: #333;
        }
      `}</style>
      
      {/* 头部导航 */}
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

      {/* 主要内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：合同信息和内容 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 合同基本信息 */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl mb-1">
                    {contract.contract_number}
                  </CardTitle>
                  <p className="text-gray-600">
                    {contract.template?.name || '合同模板'}
                  </p>
                </div>
                <Badge className={getStatusColor(contract.status)}>
                  {CONTRACT_STATUS_MAP[contract.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500 mb-1">创建时间</div>
                  <div className="font-medium">
                    {new Date(contract.created_at).toLocaleString('zh-CN')}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">更新时间</div>
                  <div className="font-medium">
                    {new Date(contract.updated_at).toLocaleString('zh-CN')}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 合同内容 */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>合同内容预览</CardTitle>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-gray-500">
                    已填充会员信息的正式合同
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchContract}
                      disabled={loading}
                    >
                      🔄 刷新
                    </Button>
                    {/* 紧急修复按钮 - 仅在开发环境显示 */}
                    {process.env.NODE_ENV === 'development' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRegenerateContract}
                          disabled={loading}
                          className="text-orange-600 border-orange-300 hover:bg-orange-50"
                          title="仅开发环境可见 - 用于修复变量填充问题"
                        >
                          🔧 修复填充
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleUpdateTemplates}
                          disabled={loading}
                          className="text-blue-600 border-blue-300 hover:bg-blue-50"
                          title="仅开发环境可见 - 更新合同模板"
                        >
                          📋 更新模板
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div 
                className="border rounded-lg bg-white overflow-y-auto shadow-inner"
                style={{ height: '500px', maxHeight: '70vh' }}
              >
                <div className="p-6">
                  {contract.content ? (
                    <div 
                      className="contract-preview"
                      dangerouslySetInnerHTML={{ __html: contract.content }} 
                      style={{
                        fontFamily: '"Microsoft YaHei", Arial, sans-serif',
                        lineHeight: '1.6',
                        fontSize: '14px',
                        color: '#333'
                      }}
                    />
                  ) : (
                    <div className="text-center text-gray-500 py-20">
                      <div className="text-base">合同内容为空</div>
                      <div className="text-sm mt-2">请检查合同模板是否正确配置</div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 合同变量信息 - 调试用 */}
              {process.env.NODE_ENV === 'development' && contract.variables && (
                <details className="mt-4 border rounded-lg p-4 bg-gray-50">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                    🔍 合同变量详情（开发模式）
                  </summary>
                  <div className="text-xs bg-white p-3 rounded border">
                    <pre className="whitespace-pre-wrap text-gray-600">
                      {JSON.stringify(contract.variables, null, 2)}
                    </pre>
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右侧：会员信息和操作 */}
        <div className="space-y-6">
          {/* 会员信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>👤</span>
                会员信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">会员姓名</div>
                <div className="font-medium">
                  {contract.member?.member_real_name || contract.member?.member_name || '未设置'}
                </div>
                {contract.member?.member_real_name && contract.member?.member_name && 
                 contract.member.member_real_name !== contract.member.member_name && (
                  <div className="text-xs text-gray-400">
                    昵称：{contract.member.member_name}
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">会员编号</div>
                <div className="font-medium">
                  {contract.member?.member_no || '无'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">手机号</div>
                <div className="font-medium">
                  {contract.member?.member_phone || '未设置'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">身份证号</div>
                <div className="font-medium">
                  {contract.member?.member_id_card ? 
                    `${contract.member.member_id_card.substring(0, 6)}****${contract.member.member_id_card.slice(-4)}` 
                    : '未设置'
                  }
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 操作区域 */}
          <Card>
            <CardHeader>
              <CardTitle>操作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contract.status === 'PENDING' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-700 font-medium mb-3">
                    <Mail className="h-4 w-4" />
                    发送给客户签署
                  </div>
                  <div className="flex gap-2 mb-2">
                    <Input 
                      value={signUrl} 
                      readOnly 
                      className="text-xs"
                    />
                    <Button size="sm" onClick={copySignUrl}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-blue-600">
                    📧 复制此链接通过微信、短信或邮件发送给客户进行在线签署
                  </p>
                </div>
              )}
              
              <Button 
                variant="outline"
                className="w-full"
                asChild
              >
                <Link href={`/contracts/sign?id=${contractId}`} target="_blank">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  预览签署页面
                </Link>
              </Button>

              {contract.status === 'SIGNED' && (
                <Button className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  下载已签署PDF
                </Button>
              )}
            </CardContent>
          </Card>

          {/* 状态信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>📊</span>
                状态信息
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`flex items-center gap-2 p-3 rounded-lg ${
                contract.status === 'SIGNED' 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <span className="text-lg">
                  {contract.status === 'SIGNED' ? '✅' : 
                   contract.status === 'PENDING' ? '⏳' : 
                   contract.status === 'DRAFT' ? '📝' : '❌'}
                </span>
                <span className={`font-medium ${
                  contract.status === 'SIGNED' ? 'text-green-700' : 'text-yellow-700'
                }`}>
                  {contract.status === 'SIGNED' && '合同已签署'}
                  {contract.status === 'PENDING' && '等待客户签署'}
                  {contract.status === 'DRAFT' && '草稿状态'}
                  {contract.status === 'CANCELLED' && '合同已取消'}
                </span>
              </div>
              {contract.status === 'PENDING' && (
                <p className="text-xs text-gray-500 mt-2">
                  过期时间: 2025/9/24 1:57:42
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
