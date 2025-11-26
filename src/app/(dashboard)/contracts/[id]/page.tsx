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
  variables: Record<string, unknown>;
  status: 'DRAFT' | 'PENDING' | 'SIGNED' | 'CANCELLED';
  created_at: string;
  updated_at: string;
  signed_at?: string;
  expires_at?: string;
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
    }
  }, [contractId]);

  // 当合同加载完成后，如果是待签署状态，则生成安全签署链接
  useEffect(() => {
    if (contract && contract.status === 'PENDING') {
      generateSecureSignUrl();
    } else if (contract && contract.status === 'SIGNED') {
      // 已签署的合同不需要签署链接，但可以设置查看链接
      setSignUrl(`${window.location.origin}/contracts/sign?id=${contractId}`);
    }
  }, [contract, contractId]);

  const generateSecureSignUrl = async () => {
    // 只在合同状态为PENDING时生成签署令牌
    if (!contract || contract.status !== 'PENDING') {
      return;
    }

    try {
      const response = await fetch(`/api/contracts/${contractId}/sign-token`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const apiResponse = await response.json();
        // 检查响应格式，可能是直接返回或包装在data中
        const signUrl = apiResponse.data?.signUrl || apiResponse.signUrl;
        if (signUrl) {
          setSignUrl(signUrl);
        } else {
          // 如果生成令牌失败，使用默认链接
          setSignUrl(`${window.location.origin}/contracts/sign?id=${contractId}`);
        }
      } else {
        // 如果生成令牌失败，使用默认链接
        const errorData = await response.json().catch(() => ({}));
        console.warn('生成安全签署链接失败:', errorData.message || '未知错误');
        setSignUrl(`${window.location.origin}/contracts/sign?id=${contractId}`);
      }
    } catch (error) {
      console.error('生成安全签署链接失败:', error);
      // 如果生成令牌失败，使用默认链接
      setSignUrl(`${window.location.origin}/contracts/sign?id=${contractId}`);
    }
  };

  const fetchContract = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/contracts/${contractId}`);
      const apiResponse = await response.json();

      if (response.ok && apiResponse.success) {
        // API使用createSuccessResponse包装，数据在data字段中
        const contractData: Contract = apiResponse.data;
        setContract(contractData);
      } else {
        toast({
          title: '获取合同详情失败',
          description: apiResponse.error || apiResponse.message || '请稍后重试',
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
      
      const apiResponse = await response.json();
      
      if (response.ok && apiResponse.success) {
        toast({
          title: '重新生成成功',
          description: '合同内容已重新生成并填充变量',
        });
        // 重新获取合同内容
        await fetchContract();
      } else {
        toast({
          title: '重新生成失败',
          description: apiResponse.error || apiResponse.message || '请稍后重试',
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

  // 检测环境
  const detectEnvironment = () => {
    const userAgent = navigator.userAgent;
    const isWeChat = userAgent.includes('MicroMessenger');
    const isIOS = /iPhone|iPad|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const isMobile = isIOS || isAndroid;
    
    return { isWeChat, isIOS, isAndroid, isMobile };
  };

  // 下载PDF - 智能处理不同环境
  const handleDownloadPDF = () => {
    if (!contract) return;
    
    const { isWeChat, isIOS, isMobile } = detectEnvironment();
    
    console.log('PDF下载环境检测:', { isWeChat, isIOS, isMobile });

    if (isWeChat) {
      // 微信环境：提供预览页面选项
      const choice = confirm(
        '请选择PDF查看方式：\n\n' +
        '点击"确定"：在专门的预览页面中查看PDF\n' +
        '点击"取消"：直接打开PDF文件\n\n' +
        '建议选择预览页面，功能更完善'
      );
      
      if (choice) {
        // 打开专门的预览页面
        window.open(`/contracts/${contract.id}/preview`, '_blank');
      } else {
        // 直接打开PDF
        window.open(`/api/contracts/${contract.id}/pdf?mode=preview`, '_blank');
      }
    } else if (isIOS) {
      // iOS环境：提供文件保存选项
      const confirmed = confirm(
        'iOS设备PDF下载说明：\n\n' +
        '1. 点击"确定"下载PDF文件\n' +
        '2. 在弹出的分享菜单中选择"存储到文件"\n' +
        '3. 选择保存位置（如iCloud Drive）\n' +
        '4. 点击"存储"完成保存\n\n' +
        '点击"确定"开始下载'
      );
      
      if (confirmed) {
        // iOS直接下载，系统会显示分享菜单
        const link = document.createElement('a');
        link.href = `/api/contracts/${contract.id}/pdf?mode=download`;
        link.download = `contract-${contract.contract_number}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } else {
      // 桌面浏览器或其他移动浏览器：直接下载
      const link = document.createElement('a');
      link.href = `/api/contracts/${contract.id}/pdf?mode=download`;
      link.download = `contract-${contract.contract_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 显示下载提示
      toast({
        title: '开始下载',
        description: `正在下载合同 ${contract.contract_number} 的PDF文件`,
      });
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
    <div className="!p-2 md:!p-6 pb-20 md:pb-6 min-h-screen">
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
      <div className="mb-3 md:mb-6">
        <div className="flex items-center gap-2 md:gap-4 mb-3">
          <Button variant="outline" size="sm" asChild className="h-8 md:h-9">
            <Link href="/contracts/list">
              <ArrowLeft className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">返回合同列表</span>
              <span className="sm:hidden">返回</span>
            </Link>
          </Button>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">合同详情</h1>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6">
        {/* 左侧：合同信息和内容 */}
        <div className="lg:col-span-2 space-y-3 md:space-y-6">
          {/* 合同基本信息 */}
          <Card>
            <CardHeader className="!p-3 md:!p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-2 md:gap-3">
                <div className="flex-1">
                  <CardTitle className="text-lg md:text-xl mb-1">
                    {contract.contract_number}
                  </CardTitle>
                  <p className="text-sm md:text-base text-gray-600">
                    {contract.template?.name || '合同模板'}
                  </p>
                </div>
                <Badge className={getStatusColor(contract.status)}>
                  {CONTRACT_STATUS_MAP[contract.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="!p-3 md:!p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4">
                <div>
                  <div className="text-xs md:text-sm text-gray-500 mb-1">创建时间</div>
                  <div className="text-sm md:text-base font-medium">
                    {new Date(contract.created_at).toLocaleString('zh-CN')}
                  </div>
                </div>
                <div>
                  <div className="text-xs md:text-sm text-gray-500 mb-1">签署时间</div>
                  <div className="text-sm md:text-base font-medium">
                    {contract.signed_at 
                      ? new Date(contract.signed_at).toLocaleString('zh-CN')
                      : <span className="text-gray-400">未签署</span>
                    }
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-xs md:text-sm text-gray-500 mb-1">到期时间</div>
                  <div className="text-sm md:text-base font-medium">
                    {contract.expires_at 
                      ? new Date(contract.expires_at).toLocaleString('zh-CN')
                      : <span className="text-green-600 font-medium">长期有效</span>
                    }
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 合同内容 */}
          <Card>
            <CardHeader className="!p-3 md:!p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 md:gap-3">
                <CardTitle className="text-base md:text-lg">合同内容预览</CardTitle>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                  <div className="text-xs md:text-sm text-gray-500">
                    已填充会员信息的正式合同
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerateContract}
                    disabled={loading}
                    className="h-8 text-xs md:text-sm"
                  >
                    🔄 刷新预览
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="!p-3 md:!p-6">
              <div 
                className="border rounded-lg bg-white overflow-y-auto shadow-inner h-[400px] md:h-[500px] max-h-[60vh] md:max-h-[70vh]"
              >
                <div className="!p-2 md:!p-6">
                  {contract.content ? (
                    <div 
                      className="contract-preview text-xs md:text-sm"
                      dangerouslySetInnerHTML={{ __html: contract.content }} 
                    />
                  ) : (
                    <div className="text-center text-gray-500 py-20">
                      <div className="text-base">合同内容为空</div>
                      <div className="text-sm mt-2">请检查合同模板是否正确配置</div>
                    </div>
                  )}
                </div>
              </div>
              
            </CardContent>
          </Card>
        </div>

        {/* 右侧：会员信息和操作 */}
        <div className="space-y-3 md:space-y-6">
          {/* 会员信息 */}
          <Card>
            <CardHeader className="!p-3 md:!p-6">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <span>👤</span>
                会员信息
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 space-y-2 md:space-y-4">
              <div>
                <div className="text-xs md:text-sm text-gray-500 mb-1">会员姓名</div>
                <div className="text-sm md:text-base font-medium">
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
                <div className="text-xs md:text-sm text-gray-500 mb-1">会员编号</div>
                <div className="text-sm md:text-base font-medium">
                  {contract.member?.member_no || '无'}
                </div>
              </div>
              <div>
                <div className="text-xs md:text-sm text-gray-500 mb-1">手机号</div>
                <div className="text-sm md:text-base font-medium">
                  {contract.member?.member_phone || '未设置'}
                </div>
              </div>
              <div>
                <div className="text-xs md:text-sm text-gray-500 mb-1">身份证号</div>
                <div className="text-sm md:text-base font-medium">
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
            <CardHeader className="!p-3 md:!p-6">
              <CardTitle className="text-base md:text-lg">操作</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 space-y-2 md:space-y-4">
              {contract.status === 'PENDING' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 md:p-4">
                  <div className="flex items-center gap-2 text-blue-700 font-medium mb-2 md:mb-3">
                    <Mail className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="text-xs md:text-sm">发送给客户签署</span>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <Input 
                      value={signUrl} 
                      readOnly 
                      className="text-xs h-8 md:h-9"
                    />
                    <Button size="sm" onClick={copySignUrl} className="h-8 md:h-9 px-3">
                      <Copy className="h-3 w-3 md:h-4 md:w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-blue-600">
                    📧 复制此链接通过微信、短信或邮件发送给客户进行在线签署
                  </p>
                </div>
              )}
              
              <Button 
                variant="outline"
                className="w-full h-9 md:h-10 text-sm"
                asChild
              >
                <Link href={`/contracts/sign?id=${contractId}`} target="_blank">
                  <ExternalLink className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                  预览签署页面
                </Link>
              </Button>

              {contract.status === 'SIGNED' && (
                <Button 
                  className="w-full h-9 md:h-10 text-sm"
                  onClick={handleDownloadPDF}
                >
                  <Download className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                  <span className="md:hidden">下载</span>
                  <span className="hidden md:inline">下载已签署PDF</span>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* 状态信息 */}
          <Card>
            <CardHeader className="!p-3 md:!p-6">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <span>📊</span>
                状态信息
              </CardTitle>
            </CardHeader>
            <CardContent className="!p-3 md:!p-6">
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
              {contract.status === 'PENDING' && contract.expires_at && (
                <p className="text-xs text-gray-500 mt-2">
                  过期时间: {new Date(contract.expires_at).toLocaleString('zh-CN')}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
