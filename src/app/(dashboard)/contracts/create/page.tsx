'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { CONTRACT_TYPE_MAP } from '@/types/contract';
import { Search, User, FileText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Member {
  id: number;
  member_no: string;
  nickname: string;
  phone: string;
  wechat: string;
}

interface ContractTemplate {
  id: number;
  name: string;
  type: string;
  template_content: string;
  variables_schema: Record<string, string>;
}

export default function CreateContractPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [members, setMembers] = useState<Member[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [contractType, setContractType] = useState<string>('');
  const [customVariables, setCustomVariables] = useState<Record<string, string>>({});
  const [showMemberResults, setShowMemberResults] = useState(false);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  
  // 公司固定信息
  const companyInfo = {
    name: '杭州石楠文化科技有限公司',
    taxId: '91330105MA2KCLP6X2'
  };

  // 获取会员列表
  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/members?pageSize=100');
      const data = await response.json();
      if (response.ok) {
        setMembers(data.data || []);
      }
    } catch (error) {
      console.error('获取会员列表失败:', error);
    }
  };

  // 获取合同模板
  const fetchTemplates = async () => {
    try {
      console.log('🔍 正在获取合同模板...');
      const response = await fetch('/api/contracts/templates');
      const data = await response.json();
      console.log('📋 模板API响应:', data);
      if (response.ok) {
        setTemplates(data.templates || []);
        console.log('✅ 模板加载成功:', data.templates?.length || 0, '个');
      } else {
        console.error('❌ 模板API错误:', data.error);
      }
    } catch (error) {
      console.error('❌ 获取合同模板失败:', error);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchTemplates();
  }, []);

  // 注意：现在使用实时搜索，不再需要客户端过滤

  // 根据合同类型过滤模板
  const filteredTemplates = templates.filter(template =>
    !contractType || template.type === contractType
  );

  // 调试信息
  console.log('🔍 模板调试信息:');
  console.log('  - 所有模板:', templates.map(t => ({ id: t.id, name: t.name, type: t.type })));
  console.log('  - 当前合同类型:', contractType);
  console.log('  - 过滤后的模板:', filteredTemplates.map(t => ({ id: t.id, name: t.name, type: t.type })));

  // 处理合同类型变化
  const handleContractTypeChange = (type: string) => {
    setContractType(type);
    setSelectedTemplate(null);
    setCustomVariables({});
  };

  // 处理模板选择
  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id.toString() === templateId);
    setSelectedTemplate(template || null);

    if (template) {
      // 初始化自定义变量，包含自动生成的字段
      const variables: Record<string, string> = {
        // 自动生成字段
        'signing_date': new Date().toLocaleDateString('zh-CN'),
        'contract_number': generateContractNumber(),
        'company_name': companyInfo.name,
        'company_tax_id': companyInfo.taxId,
        'discount_amount': '0', // 优惠金额，默认为0
        'service_fee': '', // 服务费用，需要用户填写
        'service_type': '' // 服务类型，需要用户填写
      };
      
      // 根据合同类型添加特定字段
      if (template.type === 'ONE_TIME') {
        variables['service_count'] = ''; // 服务次数，需要用户填写
      } else {
        variables['service_end_date'] = ''; // 服务到期时间，需要用户填写
      }
      
      // 添加模板中的其他变量
      Object.keys(template.variables_schema).forEach(key => {
        if (!variables[key]) {
          variables[key] = '';
        }
      });
      
      setCustomVariables(variables);
    }
  };

  // 生成合同编号
  const generateContractNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `HT${year}${month}${day}${random}`;
  };

  // 处理自定义变量变化
  const handleVariableChange = (key: string, value: string) => {
    setCustomVariables(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 处理会员搜索
  const handleMemberSearch = async (value: string) => {
    setSearchTerm(value);
    if (value.trim().length > 0) {
      setMemberSearchLoading(true);
      try {
        const response = await fetch(`/api/members?searchKeyword=${encodeURIComponent(value)}&pageSize=20`);
        const data = await response.json();
        if (response.ok) {
          setMembers(data.data || []);
          setShowMemberResults(true);
        } else {
          console.error('搜索会员失败:', data.error);
        }
      } catch (error) {
        console.error('搜索会员失败:', error);
      } finally {
        setMemberSearchLoading(false);
      }
    } else {
      setShowMemberResults(false);
      // 清空搜索时重新加载所有会员
      fetchMembers();
    }
  };

  // 选择会员
  const handleSelectMember = (member: Member) => {
    setSelectedMember(member);
    setSearchTerm(member.nickname || member.member_no || '');
    setShowMemberResults(false);
    toast({
      title: '会员选择成功',
      description: `已选择会员: ${member.nickname || '未设置昵称'} (${member.member_no})`,
    });
  };

  // 清除会员选择
  const handleClearMember = () => {
    setSelectedMember(null);
    setSearchTerm('');
    setShowMemberResults(false);
  };

  // 生成合同
  const handleCreateContract = async () => {
    if (!selectedMember) {
      toast({
        title: '请选择会员',
        description: '请先选择一个会员',
        variant: 'destructive'
      });
      return;
    }

    if (!contractType) {
      toast({
        title: '请选择合同类型',
        description: '请选择合同类型',
        variant: 'destructive'
      });
      return;
    }

    if (!selectedTemplate) {
      toast({
        title: '请选择合同模板',
        description: '请选择一个合同模板',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: selectedMember.id,
          contractType,
          templateId: selectedTemplate.id,
          variables: customVariables
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: '合同创建成功',
          description: `合同编号: ${data.contractNumber}`,
        });
        
        // 跳转到合同详情页面
        router.push(`/contracts/${data.contractId}`);
      } else {
        toast({
          title: '创建合同失败',
          description: data.error || '请稍后重试',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('创建合同失败:', error);
      toast({
        title: '创建合同失败',
        description: '网络错误，请稍后重试',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-7xl mx-auto pb-20">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/contracts/list">
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回合同列表
              </Link>
            </Button>
            <h1 className="text-2xl font-semibold text-gray-900">发起合同</h1>
          </div>
          <p className="text-gray-600">选择会员和合同模板，创建新的合同</p>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 选择会员 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              选择会员
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="member-search">搜索会员</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="member-search"
                    placeholder="搜索会员姓名、编号或手机号..."
                    value={searchTerm}
                    onChange={(e) => handleMemberSearch(e.target.value)}
                    className="pl-10"
                  />
                  {memberSearchLoading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                </div>
              </div>

              {/* 搜索结果 */}
              {showMemberResults && (
                <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-2">
                  {members.length > 0 ? (
                    members.map((member) => (
                      <div
                        key={member.id}
                        className="p-3 border rounded-lg cursor-pointer transition-colors hover:border-blue-300 hover:bg-blue-50"
                        onClick={() => handleSelectMember(member)}
                      >
                        <div className="font-medium">{member.nickname || '未设置昵称'}</div>
                        <div className="text-sm text-gray-500">
                          编号: {member.member_no} | 手机: {member.phone || '未设置'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      {memberSearchLoading ? '搜索中...' : '未找到匹配的会员'}
                    </div>
                  )}
                </div>
              )}

              {/* 已选择的会员 */}
              {selectedMember && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-green-800 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        已选择会员
                      </div>
                      <div className="text-sm text-green-600 mt-1">
                        {selectedMember.nickname || '未设置昵称'} ({selectedMember.member_no})
                      </div>
                      <div className="text-xs text-green-500 mt-1">
                        手机: {selectedMember.phone || '未设置'}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearMember}
                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      重新选择
                    </Button>
                  </div>
                </div>
              )}

              {/* 提示信息 */}
              {!selectedMember && !showMemberResults && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-blue-700">
                    💡 在搜索框中输入会员姓名、编号或手机号进行搜索
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 选择合同类型和模板 */}
        <Card className="max-h-[80vh] flex flex-col">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              选择合同类型和模板
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            <div className="space-y-4">
              <div>
                <Label htmlFor="contract-type">合同类型</Label>
                <Select value={contractType} onValueChange={handleContractTypeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择合同类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONTRACT_TYPE_MAP).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {contractType && (
                <div>
                  <Label htmlFor="template">合同模板</Label>
                  <Select value={selectedTemplate?.id.toString() || ''} onValueChange={handleTemplateSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择合同模板" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id.toString()}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 合同信息 */}
              {selectedTemplate && (
                <div>
                  <Label>合同信息</Label>
                  <div className="space-y-4 mt-2">
                    {/* 自动生成字段 - 只读显示 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="contract_number" className="text-sm font-medium">
                          合同编号
                        </Label>
                        <Input
                          id="contract_number"
                          value={customVariables.contract_number || ''}
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>
                      <div>
                        <Label htmlFor="signing_date" className="text-sm font-medium">
                          签署日期
                        </Label>
                        <Input
                          id="signing_date"
                          value={customVariables.signing_date || ''}
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>
                    </div>

                    {/* 公司信息 - 只读显示 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="company_name" className="text-sm font-medium">
                          甲方公司名称
                        </Label>
                        <Input
                          id="company_name"
                          value={customVariables.company_name || ''}
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>
                      <div>
                        <Label htmlFor="company_tax_id" className="text-sm font-medium">
                          统一社会信用代码
                        </Label>
                        <Input
                          id="company_tax_id"
                          value={customVariables.company_tax_id || ''}
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>
                    </div>

                    {/* 客户信息 - 用户端填写 */}
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">客户信息（用户端填写）</h4>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-blue-700">
                          💡 客户信息将由客户在签署合同时自行填写，无需在此处填写
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="customer_name" className="text-sm font-medium text-gray-500">
                            客户姓名（用户端填写）
                          </Label>
                          <Input
                            id="customer_name"
                            value="客户在签署时填写"
                            readOnly
                            className="bg-gray-50 text-gray-500"
                          />
                        </div>
                        <div>
                          <Label htmlFor="customer_phone" className="text-sm font-medium text-gray-500">
                            联系电话（用户端填写）
                          </Label>
                          <Input
                            id="customer_phone"
                            value="客户在签署时填写"
                            readOnly
                            className="bg-gray-50 text-gray-500"
                          />
                        </div>
                        <div>
                          <Label htmlFor="customer_id_card" className="text-sm font-medium text-gray-500">
                            身份证号（用户端填写）
                          </Label>
                          <Input
                            id="customer_id_card"
                            value="客户在签署时填写"
                            readOnly
                            className="bg-gray-50 text-gray-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 服务信息 */}
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">服务信息</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="service_fee" className="text-sm font-medium">
                            服务费用 *
                          </Label>
                          <Input
                            id="service_fee"
                            value={customVariables.service_fee || ''}
                            onChange={(e) => handleVariableChange('service_fee', e.target.value)}
                            placeholder="请输入服务费用"
                            type="number"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="discount_amount" className="text-sm font-medium">
                            优惠金额
                          </Label>
                          <Input
                            id="discount_amount"
                            value={customVariables.discount_amount || '0'}
                            onChange={(e) => handleVariableChange('discount_amount', e.target.value)}
                            placeholder="请输入优惠金额"
                            type="number"
                          />
                        </div>
                        
                        {/* 根据合同类型显示不同字段 */}
                        {contractType === 'ONE_TIME' ? (
                          <div>
                            <Label htmlFor="service_count" className="text-sm font-medium">
                              服务次数 *
                            </Label>
                            <Input
                              id="service_count"
                              value={customVariables.service_count || ''}
                              onChange={(e) => handleVariableChange('service_count', e.target.value)}
                              placeholder="请输入服务次数"
                              type="number"
                              required
                            />
                          </div>
                        ) : (
                          <div>
                            <Label htmlFor="service_end_date" className="text-sm font-medium">
                              服务到期时间 *
                            </Label>
                            <Input
                              id="service_end_date"
                              value={customVariables.service_end_date || ''}
                              onChange={(e) => handleVariableChange('service_end_date', e.target.value)}
                              placeholder="请选择服务到期时间"
                              type="date"
                              required
                            />
                          </div>
                        )}
                        
                        <div>
                          <Label htmlFor="service_type" className="text-sm font-medium">
                            服务类型 *
                          </Label>
                          <Input
                            id="service_type"
                            value={customVariables.service_type || ''}
                            onChange={(e) => handleVariableChange('service_type', e.target.value)}
                            placeholder="请输入服务类型"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* 其他模板变量 */}
                    {Object.entries(selectedTemplate.variables_schema).map(([key, description]) => {
                      // 跳过已经处理的字段
                      const handledFields = ['contract_number', 'signing_date', 'company_name', 'company_tax_id', 
                                          'service_fee', 'discount_amount', 'service_end_date', 'service_type', 'service_count'];
                      if (handledFields.includes(key)) return null;
                      
                      return (
                        <div key={key} className="border-t pt-4">
                          <div>
                            <Label htmlFor={`var-${key}`} className="text-sm font-medium">
                              {description}
                            </Label>
                            <Input
                              id={`var-${key}`}
                              value={customVariables[key] || ''}
                              onChange={(e) => handleVariableChange(key, e.target.value)}
                              placeholder={`请输入${description}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 操作按钮 - 固定在底部 */}
      <div className="sticky bottom-0 bg-white border-t shadow-lg p-6 mt-8">
        <div className="max-w-7xl mx-auto flex justify-end gap-4">
          <Button variant="outline" asChild>
            <Link href="/contracts/list">取消</Link>
          </Button>
          <Button 
            onClick={handleCreateContract}
            disabled={loading || !selectedMember || !contractType || !selectedTemplate}
            className="min-w-[120px]"
          >
            {loading ? '创建中...' : '创建合同'}
          </Button>
        </div>
      </div>
    </div>
  );
    </div>