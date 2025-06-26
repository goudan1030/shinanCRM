'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';

interface FormData {
  member_no: string;
  nickname: string;
  wechat: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  gender: string;
  target_area: string;
  birth_year: string;
  height: string;
  weight: string;
  education: string;
  occupation: string;
  house_car: string;
  hukou_province: string;
  hukou_city: string;
  children_plan: string;
  marriage_cert: string;
  marriage_history: string;
  sexual_orientation: string;
  self_description: string;
  partner_requirement: string;
  [key: string]: string;  // 添加索引签名
}

interface SubmitData {
  [key: string]: string | null;
}

export default function NewMemberPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    member_no: '',
    nickname: '',
    wechat: '',
    phone: '',
    province: '',
    city: '',
    district: '',
    gender: '',
    target_area: '',
    birth_year: '',
    height: '',
    weight: '',
    education: '',
    occupation: '',
    house_car: '',
    hukou_province: '',
    hukou_city: '',
    children_plan: '',
    marriage_cert: '',
    marriage_history: '',
    sexual_orientation: '',
    self_description: '',
    partner_requirement: ''
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formInitialized, setFormInitialized] = useState(false);

  // 从本地存储加载表单数据
  useEffect(() => {
    try {
      const savedFormData = localStorage.getItem('newMemberFormData');
      if (savedFormData) {
        try {
          const parsedData = JSON.parse(savedFormData);
          
          const validatedData = {
            ...formData,
            ...parsedData,
            gender: parsedData.gender || '',
            education: parsedData.education || '',
            house_car: parsedData.house_car || '',
            children_plan: parsedData.children_plan || '',
            marriage_cert: parsedData.marriage_cert || '',
            marriage_history: parsedData.marriage_history || '',
            sexual_orientation: parsedData.sexual_orientation || ''
          };
          
          setFormData(prevData => ({
            ...prevData,
            ...validatedData
          }));
          console.log("已从localStorage恢复表单数据，包含下拉框值：", validatedData);
        } catch (error) {
          console.error('解析保存的表单数据失败:', error);
        }
      }
      
      setFormInitialized(true);
    } catch (error) {
      console.error('从本地存储加载表单数据失败:', error);
      setFormInitialized(true);
    }
  }, []);

  // 将表单数据保存到本地存储
  useEffect(() => {
    if (formInitialized && Object.values(formData).some(value => value !== '')) {
      try {
        // 确保我们保存的是完整的表单数据对象
        localStorage.setItem('newMemberFormData', JSON.stringify(formData));
        console.log("保存表单数据到localStorage，包含下拉框值：", formData);
      } catch (error) {
        console.error('保存表单数据到localStorage失败:', error);
      }
    }
  }, [formData, formInitialized]);

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('提交按钮被点击，开始处理表单提交...');
    e.preventDefault();
    setLoading(true);

    // 验证手机号格式
    let hasError = false;
    if (!/^1\d{10}$/.test(formData.phone)) {
      console.log('手机号验证失败:', formData.phone);
      setFieldErrors(prev => ({ ...prev, phone: '请输入正确的11位手机号码' }));
      hasError = true;
    }

    // 验证必填字段
    const requiredFields = [
      { field: 'member_no', label: '会员编号' },
      { field: 'nickname', label: '微信昵称' },
      { field: 'wechat', label: '微信号' },
      { field: 'phone', label: '手机号' },
      { field: 'province', label: '所在省份' },
      { field: 'city', label: '所在城市' },
      { field: 'district', label: '所在区市' },
      { field: 'gender', label: '性别' },
      { field: 'target_area', label: '目标区域' },
      { field: 'birth_year', label: '出生年份' },
      { field: 'height', label: '身高' },
      { field: 'weight', label: '体重' },
      { field: 'education', label: '学历' },
      { field: 'occupation', label: '职业' },
      { field: 'house_car', label: '房车情况' },
      { field: 'hukou_province', label: '户口所在省' },
      { field: 'hukou_city', label: '户口所在市' },
      { field: 'children_plan', label: '孩子需求' },
      { field: 'marriage_cert', label: '领证需求' },
      { field: 'marriage_history', label: '婚史' },
      { field: 'sexual_orientation', label: '性取向' },
      { field: 'self_description', label: '自我介绍' },
      { field: 'partner_requirement', label: '期望对方' }
    ];

    // 收集所有未填写的字段
    const emptyFields = [];
    let firstEmptyFieldElement = null;
    let newFieldErrors = { ...fieldErrors };

    for (const { field, label } of requiredFields) {
      if (!formData[field]) {
        console.log(`必填字段验证失败: ${label} 为空`);
        emptyFields.push(label);
        newFieldErrors[field] = `${label}不能为空`;
        hasError = true;
        
        // 寻找第一个空字段的DOM元素用于滚动
        if (!firstEmptyFieldElement) {
          const fieldElement = document.querySelector(`[data-field="${field}"]`);
          if (fieldElement) {
            firstEmptyFieldElement = fieldElement;
          }
        }
      } else {
        // 清除已填写字段的错误
        newFieldErrors[field] = '';
      }
    }

    // 更新所有字段错误状态
    setFieldErrors(newFieldErrors);
    
    // 如果有错误，显示汇总错误提示
    if (hasError) {
      if (firstEmptyFieldElement) {
        firstEmptyFieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
      // 为避免提示过多，只显示一条汇总信息的toast
      if (emptyFields.length > 0) {
        let description = '';
        if (emptyFields.length <= 3) {
          description = `请填写：${emptyFields.join('、')}`;
        } else {
          description = `有 ${emptyFields.length} 个必填项未完成，请检查表单`;
        }
        
        toast({
          variant: 'destructive',
          title: '创建会员失败',
          description: description
        });
      }
      
      setLoading(false);
      return;
    }

    console.log('所有字段验证通过，准备提交数据...');

    try {
      // 处理提交数据，将空字符串转换为null
      const submitData = Object.entries(formData).reduce<SubmitData>((acc, [key, value]) => {
        acc[key] = value === '' ? null : value;
        return acc;
      }, {});

      // 根据性别设置初始匹配次数
      const initialRemainingMatches = submitData.gender === 'female' ? 1 : 0;

      console.log('准备发送API请求，数据:', {
        ...submitData,
        type: 'NORMAL',
        status: 'ACTIVE',
        remaining_matches: initialRemainingMatches
      });

      const response = await fetch('/api/members/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...submitData,
          type: 'NORMAL',
          status: 'ACTIVE',
          remaining_matches: initialRemainingMatches
        })
      });

      console.log('API响应状态码:', response.status);
      const result = await response.json();
      console.log('API响应结果:', result);
      
      if (!response.ok) {
        if (typeof result === 'object' && result !== null && 'error' in result) {
          throw new Error(result.error);
        } else {
          throw new Error('创建会员失败');
        }
      }

      toast({
        title: '创建成功',
        description: '会员信息已保存'
      });

      // 清除本地存储的表单数据
      localStorage.removeItem('newMemberFormData');

      router.push('/members');
    } catch (error) {
      console.error('提交失败，错误详情:', error);
      
      // 提供更友好的错误提示
      let errorMessage = '保存失败，请重试';
      
      if (error instanceof Error) {
        if (error.message.includes('server configuration')) {
          errorMessage = '服务器配置问题，请稍后重试或联系管理员';
        } else if (error.message.includes('Database connection')) {
          errorMessage = '数据库连接失败，请检查网络连接';
        } else if (error.message.includes('网络')) {
          errorMessage = '网络连接异常，请检查网络后重试';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        variant: 'destructive',
        title: '创建会员失败',
        description: errorMessage + '。如果问题持续存在，请联系管理员'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFieldErrors(prev => ({ ...prev, [field]: '' }));
    
    if (['birth_year', 'height', 'weight'].includes(field)) {
      if (value.trim() === '') {
        setFormData(prev => ({ ...prev, [field]: '' }));
        return;
      }
      
      if (!/^\d*$/.test(value)) {
        return;
      }
    }
    
    if (['gender', 'education', 'house_car', 'marriage_history', 'sexual_orientation', 'children_plan', 'marriage_cert'].includes(field)) {
      console.log(`下拉框 ${field} 值更新为:`, value);
      
      // 立即保存到localStorage，确保下拉框值不会丢失
      if (formInitialized) {
        const updatedFormData = { ...formData, [field]: value };
        try {
          localStorage.setItem('newMemberFormData', JSON.stringify(updatedFormData));
        } catch (error) {
          console.error('保存下拉框值到localStorage失败:', error);
        }
      }
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleInputBlur = (field: string) => {
    const value = formData[field];
    
    if (['birth_year', 'height', 'weight'].includes(field)) {
      if (!value) return;
      
      const numValue = parseInt(value);
      if (isNaN(numValue)) {
        setFieldErrors(prev => ({ ...prev, [field]: '请输入有效的数字' }));
        return;
      }
      
      let errorMessage = '';
      
      if (field === 'birth_year') {
        if (numValue < 1900 || numValue > new Date().getFullYear()) {
          errorMessage = '请输入有效的出生年份';
        }
      } else if (field === 'height') {
        if (numValue < 100 || numValue > 250) {
          errorMessage = '请输入有效的身高（100-250cm）';
        }
      } else if (field === 'weight') {
        if (numValue < 30 || numValue > 200) {
          errorMessage = '请输入有效的体重（30-200kg）';
        }
      }
      
      if (errorMessage) {
        setFieldErrors(prev => ({ ...prev, [field]: errorMessage }));
        toast({
          variant: 'destructive',
          title: '输入错误',
          description: errorMessage
        });
      }
    }
  };

  // 添加清除按钮处理函数
  const handleClearForm = () => {
    const initialFormData = {
      member_no: '',
      nickname: '',
      wechat: '',
      phone: '',
      province: '',
      city: '',
      district: '',
      gender: '',
      target_area: '',
      birth_year: '',
      height: '',
      weight: '',
      education: '',
      occupation: '',
      house_car: '',
      hukou_province: '',
      hukou_city: '',
      children_plan: '',
      marriage_cert: '',
      marriage_history: '',
      sexual_orientation: '',
      self_description: '',
      partner_requirement: ''
    };
    
    setFormData(initialFormData);
    localStorage.removeItem('newMemberFormData');
    
    toast({
      title: '表单已清空',
      description: '所有输入内容已重置'
    });
  };

  return (
    <div className="overflow-auto">
      <div className="max-w-[1200px] mx-auto p-3 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Button>
            <h2 className="text-lg font-semibold">新增会员</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearForm}
          >
            清空表单
          </Button>
        </div>
        <Card className="border-none shadow-none p-3 md:p-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">个人信息</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">会员编号</label>
                    <Input
                      value={formData.member_no}
                      onChange={(e) => handleInputChange('member_no', e.target.value)}
                      placeholder="请输入会员编号"
                      data-field="member_no"
                      className={fieldErrors.member_no ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                    />
                    {fieldErrors.member_no && (
                      <p className="text-sm text-red-500 mt-1">{fieldErrors.member_no}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">微信昵称</label>
                    <Input
                      value={formData.nickname}
                      onChange={(e) => handleInputChange('nickname', e.target.value)}
                      placeholder="请输入微信昵称"
                      data-field="nickname"
                      className={fieldErrors.nickname ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                    />
                    {fieldErrors.nickname && (
                      <p className="text-sm text-red-500 mt-1">{fieldErrors.nickname}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">性别</label>
                    <Select 
                      value={formData.gender} 
                      onValueChange={(value) => handleInputChange('gender', value)}
                      data-field="gender"
                    >
                      <SelectTrigger className={fieldErrors.gender ? 'border-red-500 focus:border-red-500 ring-2 ring-red-500' : ''}>
                        <SelectValue placeholder="请选择性别" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">男</SelectItem>
                        <SelectItem value="female">女</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldErrors.gender && (
                      <p className="text-sm text-red-500 mt-1">{fieldErrors.gender}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">出生年份</label>
                    <Input
                      type="number"
                      value={formData.birth_year}
                      onChange={(e) => handleInputChange('birth_year', e.target.value)}
                      onBlur={() => handleInputBlur('birth_year')}
                      placeholder="请输入出生年份"
                      data-field="birth_year"
                      className={`${fieldErrors.birth_year ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                    />
                    {fieldErrors.birth_year && (
                      <p className="text-sm text-red-500 mt-1">{fieldErrors.birth_year}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">身高(cm)</label>
                    <Input
                      type="number"
                      value={formData.height}
                      onChange={(e) => handleInputChange('height', e.target.value)}
                      onBlur={() => handleInputBlur('height')}
                      placeholder="请输入身高"
                      data-field="height"
                      className={`${fieldErrors.height ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                    />
                    {fieldErrors.height && (
                      <p className="text-sm text-red-500 mt-1">{fieldErrors.height}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">体重(kg)</label>
                    <Input
                      type="number"
                      value={formData.weight}
                      onChange={(e) => handleInputChange('weight', e.target.value)}
                      onBlur={() => handleInputBlur('weight')}
                      placeholder="请输入体重"
                      data-field="weight"
                      className={`${fieldErrors.weight ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                    />
                    {fieldErrors.weight && (
                      <p className="text-sm text-red-500 mt-1">{fieldErrors.weight}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">所在省份</label>
                    <Input
                      value={formData.province}
                      onChange={(e) => handleInputChange('province', e.target.value)}
                      placeholder="请输入所在省份"
                      data-field="province"
                      className={fieldErrors.province ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                    />
                    {fieldErrors.province && (
                      <p className="text-sm text-red-500 mt-1">{fieldErrors.province}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">所在城市</label>
                    <Input
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="请输入所在城市"
                      data-field="city"
                      className={fieldErrors.city ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                    />
                    {fieldErrors.city && (
                      <p className="text-sm text-red-500 mt-1">{fieldErrors.city}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">所在区市</label>
                    <Input
                      value={formData.district}
                      onChange={(e) => handleInputChange('district', e.target.value)}
                      placeholder="请输入所在区市"
                      data-field="district"
                      className={fieldErrors.district ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                    />
                    {fieldErrors.district && (
                      <p className="text-sm text-red-500 mt-1">{fieldErrors.district}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">户口所在省</label>
                    <Input
                      value={formData.hukou_province}
                      onChange={(e) => handleInputChange('hukou_province', e.target.value)}
                      placeholder="请输入户口所在省"
                      data-field="hukou_province"
                      className={fieldErrors.hukou_province ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                    />
                    {fieldErrors.hukou_province && (
                      <p className="text-sm text-red-500 mt-1">{fieldErrors.hukou_province}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">户口所在市</label>
                    <Input
                      value={formData.hukou_city}
                      onChange={(e) => handleInputChange('hukou_city', e.target.value)}
                      placeholder="请输入户口所在市"
                      data-field="hukou_city"
                      className={fieldErrors.hukou_city ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                    />
                    {fieldErrors.hukou_city && (
                      <p className="text-sm text-red-500 mt-1">{fieldErrors.hukou_city}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">学历</label>
                    <Select 
                      value={formData.education} 
                      onValueChange={(value) => handleInputChange('education', value)}
                      data-field="education"
                    >
                      <SelectTrigger className={fieldErrors.education ? 'border-red-500 focus:border-red-500 ring-2 ring-red-500' : ''}>
                        <SelectValue placeholder="请选择学历" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PRIMARY_SCHOOL">小学</SelectItem>
                        <SelectItem value="MIDDLE_SCHOOL">初中</SelectItem>
                        <SelectItem value="HIGH_SCHOOL">高中</SelectItem>
                        <SelectItem value="JUNIOR_COLLEGE">大专</SelectItem>
                        <SelectItem value="BACHELOR">本科</SelectItem>
                        <SelectItem value="MASTER">硕士</SelectItem>
                        <SelectItem value="DOCTOR">博士</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldErrors.education && (
                      <p className="text-sm text-red-500 mt-1">{fieldErrors.education}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">职业</label>
                    <Input
                      value={formData.occupation}
                      onChange={(e) => handleInputChange('occupation', e.target.value)}
                      placeholder="请输入职业"
                      data-field="occupation"
                      className={fieldErrors.occupation ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                    />
                    {fieldErrors.occupation && (
                      <p className="text-sm text-red-500 mt-1">{fieldErrors.occupation}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">房车情况</label>
                    <Select 
                      value={formData.house_car} 
                      onValueChange={(value) => handleInputChange('house_car', value)}
                      data-field="house_car"
                    >
                      <SelectTrigger className={fieldErrors.house_car ? 'border-red-500 focus:border-red-500 ring-2 ring-red-500' : ''}>
                        <SelectValue placeholder="请选择房车情况" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEITHER">无房无车</SelectItem>
                        <SelectItem value="HOUSE_ONLY">有房无车</SelectItem>
                        <SelectItem value="CAR_ONLY">有车无房</SelectItem>
                        <SelectItem value="BOTH">有房有车</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldErrors.house_car && (
                      <p className="text-sm text-red-500 mt-1">{fieldErrors.house_car}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">婚史</label>
                    <Select 
                      value={formData.marriage_history} 
                      onValueChange={(value) => handleInputChange('marriage_history', value)}
                      data-field="marriage_history"
                    >
                      <SelectTrigger className={fieldErrors.marriage_history ? 'border-red-500 focus:border-red-500 ring-2 ring-red-500' : ''}>
                        <SelectValue placeholder="请选择婚史" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="YES">有婚史</SelectItem>
                        <SelectItem value="NO">无婚史</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldErrors.marriage_history && (
                      <p className="text-sm text-red-500 mt-1">{fieldErrors.marriage_history}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">性取向</label>
                    <Select 
                      value={formData.sexual_orientation} 
                      onValueChange={(value) => handleInputChange('sexual_orientation', value)}
                      data-field="sexual_orientation"
                    >
                      <SelectTrigger className={fieldErrors.sexual_orientation ? 'border-red-500 focus:border-red-500 ring-2 ring-red-500' : ''}>
                        <SelectValue placeholder="请选择性取向" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STRAIGHT_MALE">直男</SelectItem>
                        <SelectItem value="STRAIGHT_FEMALE">直女</SelectItem>
                        <SelectItem value="LES">LES</SelectItem>
                        <SelectItem value="GAY">GAY</SelectItem>
                        <SelectItem value="ASEXUAL">无性恋</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldErrors.sexual_orientation && (
                      <p className="text-sm text-red-500 mt-1">{fieldErrors.sexual_orientation}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <h2 className="text-lg font-semibold mb-4">联系方式</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">微信号</label>
                    <Input
                      value={formData.wechat}
                      onChange={(e) => handleInputChange('wechat', e.target.value)}
                      placeholder="请输入微信号"
                      data-field="wechat"
                      className={fieldErrors.wechat ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                    />
                    {fieldErrors.wechat && (
                      <p className="text-sm text-red-500 mt-1">{fieldErrors.wechat}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">手机号</label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="请输入手机号"
                      data-field="phone"
                      className={fieldErrors.phone ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                    />
                    {fieldErrors.phone && (
                      <p className="text-sm text-red-500 mt-1">{fieldErrors.phone}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <h2 className="text-lg font-semibold mb-4">形婚需求</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">目标区域</label>
                    <Input
                      value={formData.target_area}
                      onChange={(e) => handleInputChange('target_area', e.target.value)}
                      placeholder="请输入目标区域"
                      data-field="target_area"
                      className={fieldErrors.target_area ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                    />
                    {fieldErrors.target_area && (
                      <p className="text-sm text-red-500 mt-1">{fieldErrors.target_area}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">孩子需求</label>
                    <Select 
                      value={formData.children_plan} 
                      onValueChange={(value) => handleInputChange('children_plan', value)}
                      data-field="children_plan"
                    >
                      <SelectTrigger className={fieldErrors.children_plan ? 'border-red-500 focus:border-red-500 ring-2 ring-red-500' : ''}>
                        <SelectValue placeholder="请选择孩子需求" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BOTH">一起要</SelectItem>
                        <SelectItem value="SEPARATE">各自要</SelectItem>
                        <SelectItem value="NEGOTIATE">互相协商</SelectItem>
                        <SelectItem value="NONE">不要</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldErrors.children_plan && (
                      <p className="text-sm text-red-500 mt-1">{fieldErrors.children_plan}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">领证需求</label>
                    <Select 
                      value={formData.marriage_cert} 
                      onValueChange={(value) => handleInputChange('marriage_cert', value)}
                      data-field="marriage_cert"
                    >
                      <SelectTrigger className={fieldErrors.marriage_cert ? 'border-red-500 focus:border-red-500 ring-2 ring-red-500' : ''}>
                        <SelectValue placeholder="请选择领证需求" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WANT">要</SelectItem>
                        <SelectItem value="DONT_WANT">不要</SelectItem>
                        <SelectItem value="NEGOTIATE">互相协商</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldErrors.marriage_cert && (
                      <p className="text-sm text-red-500 mt-1">{fieldErrors.marriage_cert}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">自我介绍</label>
                    <textarea
                      value={formData.self_description}
                      onChange={(e) => handleInputChange('self_description', e.target.value)}
                      placeholder="请输入自我介绍"
                      data-field="self_description"
                      className={`w-full min-h-[100px] p-2 rounded-md border border-input bg-background ${
                        fieldErrors.self_description ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                      }`}
                    />
                    {fieldErrors.self_description && (
                      <p className="text-sm text-red-500 mt-1">{fieldErrors.self_description}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">期望对方</label>
                    <textarea
                      value={formData.partner_requirement}
                      onChange={(e) => handleInputChange('partner_requirement', e.target.value)}
                      placeholder="请输入择偶要求"
                      data-field="partner_requirement"
                      className={`w-full min-h-[100px] p-2 rounded-md border border-input bg-background ${
                        fieldErrors.partner_requirement ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                      }`}
                    />
                    {fieldErrors.partner_requirement && (
                      <p className="text-sm text-red-500 mt-1">{fieldErrors.partner_requirement}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClearForm}
              >
                清空
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-primary text-white"
                onClick={(e) => {
                  console.log('保存按钮被点击');
                  if (e.currentTarget.form) {
                    console.log('触发表单提交');
                  }
                }}
              >
                {loading ? '保存中...' : '保存'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}