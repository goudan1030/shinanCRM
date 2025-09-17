'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { Contract } from '@/types/contract';
import { CheckCircle, Download, ArrowLeft } from 'lucide-react';
import dynamic from 'next/dynamic';

const SignatureCanvas = dynamic(() => import('react-signature-canvas'), {
  ssr: false,
  loading: () => <div style={{ 
    width: '100%', 
    height: '200px', 
    backgroundColor: '#f3f4f6', 
    borderRadius: '8px', 
    border: '2px dashed #d1d5db',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6b7280'
  }}>加载签名组件中...</div>
});

function ContractSignContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const contractId = searchParams.get('id');
  
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signatureRef, setSignatureRef] = useState<any>(null);
  const [isSigned, setIsSigned] = useState(false);
  
  // 签署流程状态：info = 填写信息，signature = 签名
  const [signStep, setSignStep] = useState<'info' | 'signature'>('info');
  
  // 签署者信息
  const [signerInfo, setSignerInfo] = useState({
    realName: '',
    idCard: '',
    phone: ''
  });

  // 获取合同详情
  const fetchContract = async () => {
    if (!contractId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/contracts/${contractId}/sign-view`);
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

  // 添加全局样式重置
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        overflow-x: hidden;
      }
      body {
        margin: 0 !important;
        padding: 0 !important;
      }
      .antialiased {
        margin: 0 !important;
        padding: 0 !important;
      }
      * {
        box-sizing: border-box;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // 验证签署者信息
  const validateSignerInfo = () => {
    const { realName, idCard, phone } = signerInfo;
    
    if (!realName.trim()) {
      toast({
        title: '请填写真实姓名',
        description: '真实姓名不能为空',
        variant: 'destructive'
      });
      return false;
    }
    
    if (!idCard.trim()) {
      toast({
        title: '请填写身份证号',
        description: '身份证号不能为空',
        variant: 'destructive'
      });
      return false;
    }
    
    // 简单身份证号格式验证
    const idCardRegex = /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/;
    if (!idCardRegex.test(idCard)) {
      toast({
        title: '身份证号格式错误',
        description: '请输入正确的18位身份证号',
        variant: 'destructive'
      });
      return false;
    }
    
    if (!phone.trim()) {
      toast({
        title: '请填写手机号',
        description: '手机号不能为空',
        variant: 'destructive'
      });
      return false;
    }
    
    // 手机号格式验证
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      toast({
        title: '手机号格式错误',
        description: '请输入正确的11位手机号',
        variant: 'destructive'
      });
      return false;
    }
    
    return true;
  };

  // 处理下一步（从信息填写到签名）
  const handleNextStep = () => {
    if (validateSignerInfo()) {
      setSignStep('signature');
    }
  };

  // 返回上一步
  const handlePrevStep = () => {
    setSignStep('info');
  };

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
          signerType: 'CUSTOMER',
          signerInfo: {
            realName: signerInfo.realName,
            idCard: signerInfo.idCard,
            phone: signerInfo.phone
          }
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
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#ffffff',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ color: '#666', fontSize: '16px' }}>加载中...</div>
      </div>
    );
  }

  if (!contractId || !contract) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#ffffff',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            {!contractId ? '请选择要签署的合同' : '合同不存在或已过期'}
          </p>
          <a 
            href="/contracts/list" 
            style={{ 
              color: '#3b82f6', 
              textDecoration: 'none',
              padding: '10px 20px',
              border: '1px solid #3b82f6',
              borderRadius: '6px'
            }}
          >
            查看合同列表
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      margin: '0',
      padding: '0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      overflow: 'auto'
    }}>
      {/* 页面标题 */}
      <div style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        padding: '12px 4px',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#111827',
          margin: '0 0 4px 0'
        }}>
          合同详情
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          margin: '0'
        }}>
          请仔细阅读合同内容，确认无误后进行签署
        </p>
      </div>


      {/* 合同内容 */}
      <div style={{
        backgroundColor: '#ffffff',
        margin: '0',
        borderRadius: '0',
        border: 'none',
        borderBottom: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '8px 16px',
          backgroundColor: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <h2 style={{
            fontSize: '16px',
            fontWeight: '500',
            color: '#111827',
            margin: '0'
          }}>
            合同内容
          </h2>
        </div>
        <div style={{
          padding: '12px 16px',
          height: '50vh',
          overflowY: 'auto',
          fontSize: '13px',
          lineHeight: '1.6',
          color: '#374151'
        }}
        dangerouslySetInnerHTML={{ __html: contract.content }}
        />
      </div>

      {/* 签署区域 - 信息填写步骤 */}
      {!isSigned && signStep === 'info' && (
        <div style={{
          backgroundColor: '#ffffff',
          margin: '0',
          borderRadius: '0',
          border: 'none',
          borderBottom: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '8px 16px',
            backgroundColor: '#f9fafb',
            borderBottom: '1px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <h2 style={{
              fontSize: '16px',
              fontWeight: '500',
              color: '#111827',
              margin: '0 0 4px 0'
            }}>
              签署信息填写（第1步）
            </h2>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: '0'
            }}>
              请填写您的真实信息
            </p>
          </div>
          <div style={{ padding: '16px' }}>
            {/* 真实姓名 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '6px'
              }}>
                真实姓名 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={signerInfo.realName}
                onChange={(e) => setSignerInfo(prev => ({ ...prev, realName: e.target.value }))}
                placeholder="请输入您的真实姓名"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: '#ffffff',
                  outline: 'none'
                }}
              />
            </div>

            {/* 身份证号 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '6px'
              }}>
                身份证号 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={signerInfo.idCard}
                onChange={(e) => setSignerInfo(prev => ({ ...prev, idCard: e.target.value }))}
                placeholder="请输入18位身份证号"
                maxLength={18}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: '#ffffff',
                  outline: 'none'
                }}
              />
            </div>

            {/* 手机号 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '6px'
              }}>
                手机号 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="tel"
                value={signerInfo.phone}
                onChange={(e) => setSignerInfo(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="请输入11位手机号"
                maxLength={11}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: '#ffffff',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 签署区域 - 签名步骤 */}
      {!isSigned && signStep === 'signature' && (
        <div style={{
          backgroundColor: '#ffffff',
          margin: '0',
          borderRadius: '0',
          border: 'none',
          borderBottom: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '8px 16px',
            backgroundColor: '#f9fafb',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <button
              onClick={handlePrevStep}
              style={{
                position: 'absolute',
                left: '16px',
                padding: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <ArrowLeft style={{ width: '18px', height: '18px' }} />
            </button>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{
                fontSize: '16px',
                fontWeight: '500',
                color: '#111827',
                margin: '0 0 4px 0'
              }}>
                电子签名（第2步）
              </h2>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: '0'
              }}>
                请在下方区域进行签名
              </p>
            </div>
          </div>

          {/* 签署者信息确认 */}
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <p style={{
              fontSize: '13px',
              color: '#64748b',
              margin: '0 0 8px 0'
            }}>
              签署信息确认：
            </p>
            <div style={{
              fontSize: '13px',
              color: '#374151',
              lineHeight: '1.5'
            }}>
              <div>姓名：{signerInfo.realName}</div>
              <div>身份证：{signerInfo.idCard}</div>
              <div>手机：{signerInfo.phone}</div>
            </div>
          </div>

          <div style={{ padding: '12px 16px' }}>
            <div style={{
              border: '2px dashed #d1d5db',
              borderRadius: '8px',
              padding: '12px',
              textAlign: 'center',
              backgroundColor: '#fafafa'
            }}>
              <SignatureCanvas
                ref={setSignatureRef}
                canvasProps={{
                  width: Math.min(window.innerWidth - 80, 350),
                  height: 150,
                  style: {
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    backgroundColor: '#ffffff',
                    width: '100%',
                    maxWidth: '100%'
                  }
                }}
                backgroundColor="rgba(255, 255, 255, 1)"
                penColor="rgb(0, 0, 0)"
              />
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: '12px 0 0 0'
              }}>
                请在上方区域进行手写签名
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 已签署状态 */}
      {isSigned && (
        <div style={{
          backgroundColor: '#ffffff',
          margin: '4px 4px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          padding: '16px',
          textAlign: 'center'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#059669',
            marginBottom: '12px'
          }}>
            <CheckCircle style={{ width: '20px', height: '20px', marginRight: '8px' }} />
            <span style={{ fontSize: '16px', fontWeight: '500' }}>合同已签署完成</span>
          </div>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            margin: '0'
          }}>
            签署时间：{contract.signed_at ? new Date(contract.signed_at).toLocaleString('zh-CN') : ''}
          </p>
        </div>
      )}

      {/* 底部操作按钮 */}
      <div style={{
        position: 'fixed',
        bottom: '0',
        left: '0',
        right: '0',
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e5e7eb',
        padding: '8px 4px',
        display: 'flex',
        gap: '8px'
      }}>
        {isSigned ? (
          <button
            onClick={handleDownloadPDF}
            style={{
              flex: '1',
              height: '48px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <Download style={{ width: '18px', height: '18px', marginRight: '8px' }} />
            下载PDF
          </button>
        ) : signStep === 'info' ? (
          <button
            onClick={handleNextStep}
            style={{
              flex: '1',
              height: '48px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            下一步：进行签名
          </button>
        ) : (
          <>
            <button
              onClick={handleClearSignature}
              style={{
                width: '80px',
                height: '48px',
                backgroundColor: '#ffffff',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              清除签名
            </button>
            <button
              onClick={handleSign}
              disabled={signing}
              style={{
                flex: '1',
                height: '48px',
                backgroundColor: signing ? '#9ca3af' : '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: signing ? 'not-allowed' : 'pointer'
              }}
            >
              {signing ? '签署中...' : '完成签署'}
            </button>
          </>
        )}
      </div>

      {/* 底部安全距离 */}
      <div style={{ height: '60px' }} />
    </div>
  );
}

export default function ContractSignPage() {
  return (
    <Suspense fallback={
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#f9fafb',
        padding: '24px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ 
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ color: '#6b7280', fontSize: '16px' }}>加载中...</div>
        </div>
      </div>
    }>
      <ContractSignContent />
    </Suspense>
  );
}