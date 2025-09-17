'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Contract } from '@/types/contract';
import { FileText, Download, CheckCircle } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';

export default function ContractSignPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const contractId = searchParams.get('id');
  
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signatureRef, setSignatureRef] = useState<SignatureCanvas | null>(null);
  const [isSigned, setIsSigned] = useState(false);

  // 获取合同详情
  const fetchContract = async () => {
    if (!contractId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/contracts/${contractId}`);
      const data = await response.json();

      if (response.ok) {
        setContract(data);
        setIsSigned(data.status === 'SIGNED');
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

  useEffect(() => {
    fetchContract();
  }, [contractId]);

  // 处理签署
  const handleSign = async () => {
    if (!contract || !signatureRef) return;

    try {
      setSigning(true);
      
      // 获取签名数据
      const signatureData = signatureRef.toDataURL();
      
      if (signatureRef.isEmpty()) {
        toast({
          title: '请先签名',
          description: '请在签名区域进行签名',
          variant: 'destructive'
        });
        return;
      }

      const response = await fetch(`/api/contracts/${contract.id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureData,
          signerType: 'CUSTOMER'
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: '签署成功',
          description: '合同已成功签署',
        });
        setIsSigned(true);
        // 刷新合同状态
        fetchContract();
      } else {
        toast({
          title: '签署失败',
          description: data.error || '请稍后重试',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('签署失败:', error);
      toast({
        title: '签署失败',
        description: '网络错误，请稍后重试',
        variant: 'destructive'
      });
    } finally {
      setSigning(false);
    }
  };

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

  // 清除签名
  const handleClearSignature = () => {
    if (signatureRef) {
      signatureRef.clear();
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
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">合同签署</h1>
        <p className="text-gray-600">请仔细阅读合同内容，确认无误后进行签署</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 合同信息 */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>合同信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">合同编号</label>
                <p className="text-sm">{contract.contract_number}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">合同类型</label>
                <p className="text-sm">
                  {contract.contract_type === 'MEMBERSHIP' ? '会员服务' :
                   contract.contract_type === 'ONE_TIME' ? '一次性服务' : '年费服务'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">会员信息</label>
                <p className="text-sm">{contract.member?.name}</p>
                <p className="text-sm text-gray-500">{contract.member?.member_no}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">创建时间</label>
                <p className="text-sm">{new Date(contract.created_at).toLocaleString('zh-CN')}</p>
              </div>
              {contract.expires_at && (
                <div>
                  <label className="text-sm font-medium text-gray-500">过期时间</label>
                  <p className="text-sm">{new Date(contract.expires_at).toLocaleString('zh-CN')}</p>
                </div>
              )}
              {isSigned && (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <span className="text-sm">已签署</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          <div className="mt-4 space-y-2">
            {isSigned ? (
              <Button onClick={handleDownloadPDF} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                下载PDF
              </Button>
            ) : (
              <>
                <Button 
                  onClick={handleSign} 
                  disabled={signing}
                  className="w-full"
                >
                  {signing ? '签署中...' : '确认签署'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleClearSignature}
                  className="w-full"
                >
                  清除签名
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 合同内容和签名区域 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>合同内容</CardTitle>
            </CardHeader>
            <CardContent>
              {/* 合同内容 */}
              <div 
                className="prose max-w-none mb-6"
                dangerouslySetInnerHTML={{ __html: contract.content }}
              />

              {/* 签名区域 */}
              {!isSigned && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">电子签名</h3>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <SignatureCanvas
                      ref={setSignatureRef}
                      canvasProps={{
                        width: 600,
                        height: 200,
                        className: 'signature-canvas border border-gray-300 rounded'
                      }}
                      backgroundColor="rgba(255, 255, 255, 0)"
                      penColor="rgb(0, 0, 0)"
                    />
                    <p className="text-sm text-gray-500 mt-2 text-center">
                      请在上方区域进行签名
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
