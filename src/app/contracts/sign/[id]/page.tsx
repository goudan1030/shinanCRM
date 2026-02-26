'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { FileText, PenTool, CheckCircle } from 'lucide-react';

interface Contract {
  id: number;
  contract_number: string;
  content: string;
  variables: Record<string, any>;
  status: string;
  member: {
    id: number;
    name: string;
    phone: string;
    id_card: string;
  };
}

export default function ContractSignPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signatureData, setSignatureData] = useState<string>('');
  const [signerName, setSignerName] = useState('');
  const [signerIdCard, setSignerIdCard] = useState('');
  const [signerPhone, setSignerPhone] = useState('');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // 获取合同详情
  useEffect(() => {
    const fetchContract = async () => {
      try {
        const response = await fetch(`/api/contracts/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setContract(data);
        } else {
          throw new Error('获取合同失败');
        }
      } catch (error) {
        console.error('获取合同失败:', error);
        toast({
          title: '错误',
          description: '获取合同失败',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchContract();
    }
  }, [params.id, toast]);

  // 初始化画布
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置画布样式
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  // 开始绘制
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  // 绘制中
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  // 结束绘制
  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 保存签名数据
    const signatureData = canvas.toDataURL('image/png');
    setSignatureData(signatureData);
  };

  // 清除签名
  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData('');
  };

  // 签署合同
  const handleSignContract = async () => {
    if (!signatureData) {
      toast({
        title: '请先签名',
        description: '请先在签名区域签名',
        variant: 'destructive'
      });
      return;
    }

    if (!signerName || !signerIdCard || !signerPhone) {
      toast({
        title: '请填写完整信息',
        description: '请填写签名人姓名、身份证号和联系电话',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSigning(true);

      const response = await fetch(`/api/contracts/${params.id}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signatureData,
          signerType: 'CUSTOMER',
          signerInfo: {
            realName: signerName,
            idCard: signerIdCard,
            phone: signerPhone
          }
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: '签署成功',
          description: '合同已成功签署',
        });
        
        // 跳转到合同详情页
        router.push(`/contracts/${params.id}`);
      } else {
        throw new Error(data.message || '签署失败');
      }
    } catch (error) {
      console.error('签署失败:', error);
      toast({
        title: '签署失败',
        description: error instanceof Error ? error.message : '签署合同时发生错误',
        variant: 'destructive'
      });
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">加载中...</div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-red-600">合同不存在或已被删除</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              合同签署
            </CardTitle>
            <p className="text-sm text-gray-600">
              合同编号：{contract.contract_number}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 合同内容预览 */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-medium mb-2">合同内容预览</h3>
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: contract.content }}
              />
            </div>

            {/* 签名人信息 */}
            <div className="space-y-4">
              <h3 className="font-medium">签名人信息</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="signer_name">姓名 *</Label>
                  <Input
                    id="signer_name"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="请输入真实姓名"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="signer_id_card">身份证号 *</Label>
                  <Input
                    id="signer_id_card"
                    value={signerIdCard}
                    onChange={(e) => setSignerIdCard(e.target.value)}
                    placeholder="请输入身份证号"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="signer_phone">联系电话 *</Label>
                  <Input
                    id="signer_phone"
                    value={signerPhone}
                    onChange={(e) => setSignerPhone(e.target.value)}
                    placeholder="请输入联系电话"
                    required
                  />
                </div>
              </div>
            </div>

            {/* 电子签名区域 */}
            <div className="space-y-4">
              <h3 className="font-medium">电子签名</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={200}
                  className="border border-gray-300 rounded cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
                <div className="mt-2 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSignature}
                  >
                    清除签名
                  </Button>
                  <span className="text-sm text-gray-500">
                    请在上述区域签名
                  </span>
                </div>
              </div>
            </div>

            {/* 签署按钮 */}
            <div className="flex justify-center">
              <Button
                onClick={handleSignContract}
                disabled={signing || !signatureData}
                className="px-8 py-2"
              >
                {signing ? (
                  '签署中...'
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    确认签署合同
                  </>
                )}
              </Button>
            </div>

            {/* 签署说明 */}
            <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">签署说明：</h4>
              <ul className="space-y-1">
                <li>• 请确保填写的信息真实有效</li>
                <li>• 电子签名具有法律效力</li>
                <li>• 签署后合同将立即生效</li>
                <li>• 如有疑问请联系客服</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
