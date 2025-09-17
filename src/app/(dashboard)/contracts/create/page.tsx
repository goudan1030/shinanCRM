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

  // 获取会员列表
  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/members?limit=100');
      const data = await response.json();
      if (response.ok) {
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error('获取会员列表失败:', error);
    }
  };

  // 获取合同模板
  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/contracts/templates');
      const data = await response.json();
      if (response.ok) {
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('获取合同模板失败:', error);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchTemplates();
  }, []);

  // 过滤会员
  const filteredMembers = members.filter(member =>
    member.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.member_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.phone?.includes(searchTerm)
  );

  // 根据合同类型过滤模板
  const filteredTemplates = templates.filter(template =>
    !contractType || template.type === contractType
  );

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
      // 初始化自定义变量
      const variables: Record<string, string> = {};
      Object.keys(template.variables_schema).forEach(key => {
        variables[key] = '';
      });
      setCustomVariables(variables);
    }
  };

  // 处理自定义变量变化
  const handleVariableChange = (key: string, value: string) => {
    setCustomVariables(prev => ({
      ...prev,
      [key]: value
    }));
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
    <div className="p-6">
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
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2">
                {filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedMember?.id === member.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedMember(member)}
                  >
                    <div className="font-medium">{member.nickname || '未设置昵称'}</div>
                    <div className="text-sm text-gray-500">
                      编号: {member.member_no} | 手机: {member.phone}
                    </div>
                  </div>
                ))}
              </div>

              {selectedMember && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="font-medium text-green-800">已选择会员</div>
                  <div className="text-sm text-green-600">
                    {selectedMember.nickname || '未设置昵称'} ({selectedMember.member_no})
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 选择合同类型和模板 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              选择合同类型和模板
            </CardTitle>
          </CardHeader>
          <CardContent>
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

              {/* 自定义变量 */}
              {selectedTemplate && Object.keys(customVariables).length > 0 && (
                <div>
                  <Label>自定义变量</Label>
                  <div className="space-y-2 mt-2">
                    {Object.entries(selectedTemplate.variables_schema).map(([key, description]) => (
                      <div key={key}>
                        <Label htmlFor={`var-${key}`} className="text-sm">
                          {description}
                        </Label>
                        <Input
                          id={`var-${key}`}
                          value={customVariables[key] || ''}
                          onChange={(e) => handleVariableChange(key, e.target.value)}
                          placeholder={`请输入${description}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 操作按钮 */}
      <div className="mt-6 flex justify-end gap-4">
        <Button variant="outline" asChild>
          <Link href="/contracts/list">取消</Link>
        </Button>
        <Button 
          onClick={handleCreateContract}
          disabled={loading || !selectedMember || !contractType || !selectedTemplate}
        >
          {loading ? '创建中...' : '创建合同'}
        </Button>
      </div>
    </div>
  );
}
