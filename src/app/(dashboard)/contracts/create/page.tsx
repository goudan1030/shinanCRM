'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { SERVICE_PACKAGES, ServicePackage } from '@/types/service-packages';
import { Search, User, FileText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Member {
  id: number;
  member_no: string;
  nickname: string;
  phone: string;
  wechat: string;
}

// 固定的合同模板信息
const FIXED_TEMPLATE = {
  id: 1,
  name: '石楠文化介绍服务合同',
  type: 'MEMBERSHIP',
  template_content: '',
  variables_schema: {}
};

export default function CreateContractPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // 强制启用滚动
  useEffect(() => {
    document.documentElement.style.overflow = 'auto';
    document.documentElement.style.height = 'auto';
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';
    
    // 找到所有可能阻止滚动的父元素并修复
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
      const element = el as HTMLElement;
      const computedStyle = window.getComputedStyle(element);
      if (computedStyle.overflow === 'hidden' || computedStyle.height === '100vh') {
        element.style.overflow = 'auto';
        element.style.height = 'auto';
      }
    });
  }, []);
  
  
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [customVariables, setCustomVariables] = useState<Record<string, string>>({});
  const [selectedPackages, setSelectedPackages] = useState<ServicePackage[]>([]);
  const [expirationType, setExpirationType] = useState<'fixed' | 'custom' | 'permanent'>('fixed');
  const [customExpirationDate, setCustomExpirationDate] = useState('');
  const [showMemberResults, setShowMemberResults] = useState(false);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  
  // 公司固定信息
  const companyInfo = {
    name: '杭州石楠文化科技有限公司',
    taxId: '91330105MA2KCLP6X2',
    address: '浙江省杭州市西湖区文三路259号',
    phone: '0571-88888888'
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

  useEffect(() => {
    fetchMembers();
    // 初始化固定模板的变量
    initializeTemplateVariables();
  }, []);

  // 初始化模板变量
  const initializeTemplateVariables = () => {
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
    
    // 添加服务相关字段
    variables['service_end_date'] = ''; // 服务到期时间，需要用户填写
    variables['selected_packages'] = JSON.stringify(selectedPackages); // 选中的服务套餐
    
    setCustomVariables(variables);
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

  // 处理服务套餐选择
  const handlePackageToggle = (packageId: string) => {
    const packageToToggle = SERVICE_PACKAGES.find(pkg => pkg.id === packageId);
    if (!packageToToggle) return;

    setSelectedPackages(prev => {
      const isSelected = prev.some(pkg => pkg.id === packageId);
      if (isSelected) {
        return prev.filter(pkg => pkg.id !== packageId);
      } else {
        return [...prev, packageToToggle];
      }
    });
  };


  // 计算总价格
  // 计算原价总额（根据选择的套餐自动计算）
  const originalAmount = selectedPackages.reduce((sum, pkg) => sum + pkg.price, 0);
  const contractAmount = parseFloat(customVariables.contract_amount || originalAmount.toString());

  // 计算到期时间
  const calculateExpirationDate = () => {
    if (expirationType === 'permanent') {
      return '长期有效';
    }
    
    if (expirationType === 'custom' && customExpirationDate) {
      return customExpirationDate;
    }
    
    // 检查是否选择了A套餐（固定12个月）
    const hasPackageA = selectedPackages.some(pkg => pkg.id === 'A');
    if (hasPackageA) {
      // A套餐固定12个月，以付款时间为准到明年的今天
      const today = new Date();
      const nextYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
      return nextYear.toISOString().split('T')[0];
    }
    
    // 其他套餐使用自定义时间或默认1年
    const today = new Date();
    const oneYearLater = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
    return oneYearLater.toISOString().split('T')[0];
  };

  const expirationDate = calculateExpirationDate();

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



    if (selectedPackages.length === 0) {
      toast({
        title: '请选择服务套餐',
        description: '请至少选择一个服务套餐',
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
          contractType: 'MEMBERSHIP',
          templateId: FIXED_TEMPLATE.id,
          variables: {
            // 服务信息
            serviceType: '石楠文化介绍服务',
            serviceDuration: expirationType === 'permanent' ? '长期有效' : 
                           expirationType === 'custom' ? `至${customExpirationDate}` : 
                           '1年',
            serviceFee: customVariables.contract_amount || contractAmount.toString(),
            
            // 客户信息（如果有的话）
            customerName: selectedMember?.nickname || '待客户填写',
            customerIdCard: (selectedMember as any)?.id_card || '待客户填写',
            customerPhone: selectedMember?.phone || '待客户填写',
            customerAddress: '待客户填写',
            
            // 其他信息
            selected_packages: JSON.stringify(selectedPackages),
            selected_package_numbers: selectedPackages.map(pkg => pkg.letter).join('、'),
            original_amount: originalAmount.toString(),
            contract_amount: customVariables.contract_amount || contractAmount.toString(),
            service_end_date: expirationDate,
            payment_days: '7', // 默认7天内付款
            company_account_info: '账户信息待填写'
          }
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
    <div className="p-6 max-w-7xl mx-auto pb-32" style={{ minHeight: '100vh' }}>
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

        <div className="space-y-6">
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

        {/* 合同信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              合同信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="contract-type">合同类型</Label>
                <div className="px-3 py-2 border rounded-md bg-gray-50 text-gray-700">
                  石楠文化介绍服务
                </div>
              </div>

              <div>
                <Label htmlFor="template">合同模板</Label>
                <div className="px-3 py-2 border rounded-md bg-gray-50 text-gray-700">
                  {FIXED_TEMPLATE.name}
                </div>
              </div>

              {/* 服务套餐选择 */}
              <div>
                <Label>选择服务套餐</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  {SERVICE_PACKAGES.map((pkg) => (
                    <div
                      key={pkg.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedPackages.some(selected => selected.id === pkg.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handlePackageToggle(pkg.id)}
                    >
                      <div className="flex items-center justify-between">
                 <div className="flex-1">
                        <h4 className="font-medium text-lg">{pkg.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{pkg.description}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          期限：{pkg.duration}
                          {pkg.id === 'A' && (
                            <span className="text-green-600 font-medium ml-2">（固定期限，以付款时间为准）</span>
                          )}
                        </p>
                        <p className="text-sm text-red-600 font-medium mt-1">
                          价格：¥{pkg.price}
                        </p>
                   {pkg.services && pkg.services.length > 0 && (
                     <div className="mt-2">
                       <p className="text-xs text-gray-500 mb-1">包含服务：</p>
                       <div className="max-h-20 overflow-y-auto">
                         {pkg.services.slice(0, 3).map((service, index) => (
                           <p key={index} className="text-xs text-gray-500">
                             {index + 1}. {service.substring(0, 30)}...
                           </p>
                         ))}
                         {pkg.services.length > 3 && (
                           <p className="text-xs text-gray-400">...等{pkg.services.length}项服务</p>
                         )}
                       </div>
                     </div>
                   )}
                 </div>
                      <div className="text-right">
                        <div className="mt-2">
                          <input
                            type="checkbox"
                            checked={selectedPackages.some(selected => selected.id === pkg.id)}
                            onChange={() => handlePackageToggle(pkg.id)}
                            className="w-4 h-4 text-blue-600"
                          />
                        </div>
                      </div>
                      </div>
                    </div>
                  ))}
                </div>
              {selectedPackages.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">已选择的套餐：</h4>
                  <ul className="space-y-1">
                    {selectedPackages.map((pkg) => (
                      <li key={pkg.id} className="flex justify-between">
                        <span>{pkg.name}</span>
                        <span className="text-red-600 font-medium">¥{pkg.price}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="flex justify-between font-bold text-lg">
                      <span>总计：</span>
                      <span className="text-red-600">¥{originalAmount}</span>
                    </div>
                  </div>
                </div>
              )}
              </div>

              {/* 合同信息 */}
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

                    {/* 乙方信息（公司）- 只读显示 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="company_name" className="text-sm font-medium">
                          乙方（公司）名称
                        </Label>
                        <Input
                          id="company_name"
                          value={customVariables.company_name || companyInfo.name}
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>
                      <div>
                        <Label htmlFor="company_tax_id" className="text-sm font-medium">
                          乙方统一社会信用代码
                        </Label>
                        <Input
                          id="company_tax_id"
                          value={customVariables.company_tax_id || companyInfo.taxId}
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>
                    </div>

                    {/* 甲方信息说明 - 简化显示 */}
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">甲方信息</h4>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-600" />
                          <p className="text-sm text-blue-700 font-medium">
                            甲方（客户）信息将在签署合同时由客户自行填写
                          </p>
                        </div>
                        <p className="text-xs text-blue-600 mt-2">
                          包括：客户姓名、联系电话、身份证号等个人信息
                        </p>
                      </div>
                    </div>

                    {/* 服务信息 */}
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">服务信息</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="contract_amount" className="text-sm font-medium">
                            合同金额 *
                          </Label>
                          <Input
                            id="contract_amount"
                            value={customVariables.contract_amount || contractAmount.toString()}
                            onChange={(e) => handleVariableChange('contract_amount', e.target.value)}
                            placeholder="请输入合同金额"
                            type="number"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="original_amount" className="text-sm font-medium">
                            原价总额
                          </Label>
                          <Input
                            id="original_amount"
                            value={originalAmount.toString()}
                            readOnly
                            className="bg-gray-50"
                            placeholder="根据选择的套餐自动计算"
                          />
                        </div>
                        
                        {/* 服务到期时间设置 */}
                        <div className="col-span-2">
                          <Label className="text-sm font-medium">
                            服务到期时间设置
                          </Label>
                          <div className="mt-2 space-y-4">
                            {/* 到期时间类型选择 */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  name="expirationType"
                                  value="fixed"
                                  checked={expirationType === 'fixed'}
                                  onChange={(e) => setExpirationType(e.target.value as 'fixed' | 'custom' | 'permanent')}
                                  className="mr-2"
                                />
                                <span className="text-sm">
                                  {selectedPackages.some(pkg => pkg.id === 'A') 
                                    ? 'A套餐固定12个月（到明年的今天）' 
                                    : '默认1年期限'
                                  }
                                </span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  name="expirationType"
                                  value="custom"
                                  checked={expirationType === 'custom'}
                                  onChange={(e) => setExpirationType(e.target.value as 'fixed' | 'custom' | 'permanent')}
                                  className="mr-2"
                                />
                                <span className="text-sm">自定义到期时间</span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  name="expirationType"
                                  value="permanent"
                                  checked={expirationType === 'permanent'}
                                  onChange={(e) => setExpirationType(e.target.value as 'fixed' | 'custom' | 'permanent')}
                                  className="mr-2"
                                />
                                <span className="text-sm text-green-600 font-medium">长期有效</span>
                              </label>
                            </div>
                            
                            {/* 自定义到期时间输入 */}
                            {expirationType === 'custom' && (
                              <div>
                                <Input
                                  type="date"
                                  value={customExpirationDate}
                                  onChange={(e) => setCustomExpirationDate(e.target.value)}
                                  placeholder="请选择到期时间"
                                  min={new Date().toISOString().split('T')[0]}
                                />
                              </div>
                            )}
                            
                            {/* 到期时间预览 */}
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">预计到期时间：</span>
                                <span className={`font-medium ${
                                  expirationType === 'permanent' 
                                    ? 'text-green-600' 
                                    : 'text-blue-600'
                                }`}>
                                  {expirationType === 'permanent' 
                                    ? '长期有效' 
                                    : expirationDate && expirationDate !== '长期有效'
                                      ? new Date(expirationDate).toLocaleDateString('zh-CN')
                                      : '未设置'
                                  }
                                </span>
                              </div>
                              {selectedPackages.some(pkg => pkg.id === 'A') && expirationType !== 'permanent' && (
                                <div className="text-xs text-green-600 mt-1">
                                  A套餐固定12个月期限，以付款时间为准
                                </div>
                              )}
                              {expirationType === 'permanent' && (
                                <div className="text-xs text-green-600 mt-1">
                                  服务将长期有效，无到期时间限制
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                      </div>
                    </div>

                  </div>
                </div>
            </div>
          </CardContent>
        </Card>
        </div>

      {/* 操作按钮 - 固定在底部 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg py-2 px-6 z-10">
        <div className="max-w-7xl mx-auto flex justify-end gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/contracts/list">取消</Link>
          </Button>
          <Button 
            size="sm"
            onClick={handleCreateContract}
            disabled={loading || !selectedMember}
            className="min-w-[100px]"
          >
            {loading ? '创建中...' : '创建合同'}
          </Button>
        </div>
      </div>
    </div>
  );
}