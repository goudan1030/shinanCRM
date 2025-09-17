'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Share2, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function ContractPreviewPage() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [contractInfo, setContractInfo] = useState<{
    contract_number: string;
    status: string;
  } | null>(null);

  const contractId = Array.isArray(params.id) ? params.id[0] : params.id;

  // 检测环境
  const detectEnvironment = () => {
    const userAgent = navigator.userAgent;
    const isWeChat = userAgent.includes('MicroMessenger');
    const isIOS = /iPhone|iPad|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const isMobile = isIOS || isAndroid;
    
    return { isWeChat, isIOS, isAndroid, isMobile };
  };

  const { isWeChat, isIOS, isMobile } = detectEnvironment();

  useEffect(() => {
    if (contractId) {
      fetchContractInfo();
    }
  }, [contractId]);

  const fetchContractInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/contracts/${contractId}/sign-view`);
      const data = await response.json();

      if (response.ok) {
        setContractInfo({
          contract_number: data.contract_number,
          status: data.status
        });
      } else {
        setError(data.error || '获取合同信息失败');
      }
    } catch (error) {
      console.error('获取合同信息失败:', error);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (isIOS) {
      // iOS环境：提供文件保存选项
      alert(
        'iOS设备PDF下载说明：\n\n' +
        '1. 长按下方的PDF内容\n' +
        '2. 选择"拷贝"或"分享"\n' +
        '3. 选择"存储到文件"保存到iCloud Drive\n\n' +
        '或者点击浏览器的分享按钮选择"存储到文件"'
      );
    } else {
      // 其他环境：直接下载
      const link = document.createElement('a');
      link.href = `/api/contracts/${contractId}/pdf?mode=download`;
      link.download = `contract-${contractInfo?.contract_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `合同 ${contractInfo?.contract_number}`,
        text: '查看合同PDF',
        url: window.location.href
      });
    } else {
      // 复制链接到剪贴板
      navigator.clipboard.writeText(window.location.href).then(() => {
        alert('链接已复制到剪贴板');
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载合同预览...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部工具栏 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回
              </Button>
              <div>
                <h1 className="text-lg font-semibold">合同预览</h1>
                {contractInfo && (
                  <p className="text-sm text-gray-600">
                    合同编号：{contractInfo.contract_number}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* 微信环境提示 */}
              {isWeChat && (
                <div className="hidden sm:block text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded">
                  点击右上角"..."在浏览器中打开可下载
                </div>
              )}
              
              {/* 下载按钮 */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                下载
              </Button>

              {/* 分享按钮 */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4 mr-2" />
                分享
              </Button>

              {/* 在浏览器中打开按钮（微信环境） */}
              {isWeChat && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    alert(
                      '请按照以下步骤在浏览器中打开：\n\n' +
                      '1. 点击右上角"..."菜单\n' +
                      '2. 选择"在浏览器中打开"\n' +
                      '3. 在浏览器中即可正常下载PDF'
                    );
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  浏览器打开
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 移动端提示 */}
      {isMobile && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
              </div>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">移动设备使用提示：</p>
                <ul className="space-y-1 text-xs">
                  {isWeChat && (
                    <li>• 微信中请点击右上角"..."选择"在浏览器中打开"</li>
                  )}
                  {isIOS && (
                    <li>• iOS设备可长按PDF内容选择"存储到文件"</li>
                  )}
                  <li>• 可以截屏保存或使用浏览器的打印功能</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF内容区域 */}
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* PDF嵌入 */}
          <div className="relative">
            <iframe
              src={`/api/contracts/${contractId}/pdf?mode=preview`}
              className="w-full h-[80vh] min-h-[600px]"
              title={`合同 ${contractInfo?.contract_number} 预览`}
              onLoad={() => setLoading(false)}
              onError={() => setError('PDF加载失败')}
            />
            
            {/* 加载遮罩 */}
            {loading && (
              <div className="absolute inset-0 bg-white flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">正在加载PDF...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 底部操作区域 */}
        <div className="mt-6 text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
            <Button 
              onClick={handleDownload}
              className="w-full sm:w-auto"
            >
              <Download className="h-4 w-4 mr-2" />
              下载PDF文件
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => window.print()}
              className="w-full sm:w-auto"
            >
              🖨️ 打印合同
            </Button>

            {contractInfo?.status === 'PENDING' && (
              <Link href={`/contracts/sign?id=${contractId}`}>
                <Button 
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  ✍️ 去签署合同
                </Button>
              </Link>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-4">
            如有问题，请联系客服或技术支持
          </p>
        </div>
      </div>
    </div>
  );
}
