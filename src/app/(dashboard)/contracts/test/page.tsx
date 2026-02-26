'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Contract, ContractListResponse, CONTRACT_STATUS_MAP, CONTRACT_TYPE_MAP } from '@/types/contract';
import { Eye, Download, Trash2, FileText, PenTool } from 'lucide-react';
import Link from 'next/link';

export default function ContractTestPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/contracts?page=1&limit=10&status=all&contractType=all&search=');
      const apiResponse = await response.json();

      console.log('API响应:', apiResponse);

      if (response.ok && apiResponse.success) {
        // API使用createSuccessResponse包装，数据在data字段中
        const data: ContractListResponse = apiResponse.data || {};
        setContracts(data.contracts || []);
      } else {
        console.error('获取合同列表失败:', apiResponse.error || apiResponse.message);
      }
    } catch (error) {
      console.error('获取合同列表失败:', error);
    } finally {
      setLoading(false);
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
        <div className="flex justify-center items-center h-32">
          <div className="text-gray-500">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">合同测试页面</h1>
        <p className="text-gray-600">用于调试合同列表显示问题</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>合同列表 ({contracts.length} 条)</CardTitle>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <FileText className="h-8 w-8 mb-2" />
              <p>暂无合同数据</p>
            </div>
          ) : (
            <div className="space-y-4">
              {contracts.map((contract) => (
                <div key={contract.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-lg">{contract.contract_number}</h3>
                      <div className="mt-2 space-y-1">
                        <p><strong>状态:</strong> 
                          <Badge className={`ml-2 ${getStatusColor(contract.status)}`}>
                            {CONTRACT_STATUS_MAP[contract.status]}
                          </Badge>
                        </p>
                        <p><strong>类型:</strong> {CONTRACT_TYPE_MAP[contract.contract_type]}</p>
                        <p><strong>会员:</strong> {contract.member?.name || '未知'} ({contract.member?.member_no})</p>
                        <p><strong>创建时间:</strong> {new Date(contract.created_at).toLocaleString('zh-CN')}</p>
                        <p><strong>签署时间:</strong> {contract.signed_at ? new Date(contract.signed_at).toLocaleString('zh-CN') : '未签署'}</p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 ml-4">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/contracts/${contract.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      
                      {contract.status === 'PENDING' && (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/contracts/sign?id=${contract.id}`}>
                            <PenTool className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                      
                      {contract.status === 'SIGNED' && (
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {contract.status === 'DRAFT' && (
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600">
                      <strong>调试信息:</strong> 状态={contract.status}, 
                      应该显示签署按钮={contract.status === 'PENDING' ? '是' : '否'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
