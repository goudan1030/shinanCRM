'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

interface FormData {
  member_no: string;
  nickname: string;
  wechat: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  hukou_province: string;
  hukou_city: string;
  gender: string;
  target_area: string;
  birth_year: string;
  height: string;
  weight: string;
  education: string;
  occupation: string;
  house_car: string;
  marriage_history: string;
  sexual_orientation: string;
  children_plan: string;
  marriage_cert: string;
  self_description: string;
  partner_requirement: string;
  [key: string]: string;
}

interface SubmitData {
  [key: string]: string | number | null;
}

export default function EditMemberPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { session, isLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    member_no: '',
    nickname: '',
    wechat: '',
    phone: '',
    province: '',
    city: '',
    district: '',
    hukou_province: '',
    hukou_city: '',
    gender: '',
    target_area: '',
    birth_year: '',
    height: '',
    weight: '',
    education: '',
    occupation: '',
    house_car: '',
    marriage_history: '',
    sexual_orientation: '',
    children_plan: '',
    marriage_cert: '',
    self_description: '',
    partner_requirement: ''
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [dataLoaded, setDataLoaded] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);

  const fetchMemberData = async () => {
    try {
      const localStorageKey = `editMemberFormData_${params.id}`;
      const savedFormData = localStorage.getItem(localStorageKey);
      
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
          
          console.log('从localStorage恢复的原始数据:', parsedData);
          console.log('处理后的学历字段:', validatedData.education);
          
          setFormData(prevData => ({
            ...prevData,
            ...validatedData
          }));
          setDataLoaded(true);
          setFormInitialized(true);
          console.log("已从localStorage恢复编辑表单数据，包含下拉框值：", validatedData);
          return;
        } catch (error) {
          console.error('解析保存的表单数据失败:', error);
        }
      }

      const response = await fetch(`/api/members/${params.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '获取会员信息失败');
      }

      if (data) {
        const loadedData = {
          member_no: data.member_no || '',
          nickname: data.nickname || '',
          wechat: data.wechat || '',
          phone: data.phone || '',
          province: data.province || '',
          city: data.city || '',
          district: data.district || '',
          hukou_province: data.hukou_province || '',
          hukou_city: data.hukou_city || '',
          gender: data.gender || '',
          target_area: data.target_area || '',
          birth_year: data.birth_year?.toString() || '',
          height: data.height?.toString() || '',
          weight: data.weight?.toString() || '',
          education: data.education || '',
          occupation: data.occupation || '',
          house_car: data.house_car || '',
          marriage_history: data.marriage_history || '',
          sexual_orientation: data.sexual_orientation || '',
          children_plan: data.children_plan || '',
          marriage_cert: data.marriage_cert || '',
          self_description: data.self_description || '',
          partner_requirement: data.partner_requirement || ''
        };
        
        console.log('从API获取的原始数据:', data);
        console.log('处理后的学历字段:', loadedData.education);
        
        setFormData(loadedData);
        setDataLoaded(true);
        setFormInitialized(true);
        console.log("已从API获取编辑表单数据，包含下拉框值：", loadedData);
      }
    } catch (error) {
      console.error('获取会员信息失败:', error);
      toast({
        variant: 'destructive',
        title: '获取会员信息失败',
        description: '无法加载会员信息，请重试'
      });
      setFormInitialized(true);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchMemberData();
    }
  }, [params.id]);

  useEffect(() => {
    if (formInitialized && dataLoaded && params.id) {
      try {
        const localStorageKey = `editMemberFormData_${params.id}`;
        localStorage.setItem(localStorageKey, JSON.stringify(formData));
        console.log("保存编辑表单数据到localStorage，包含下拉框值：", formData);
      } catch (error) {
        console.error('保存表单数据到localStorage失败:', error);
      }
    }
  }, [formData, dataLoaded, params.id, formInitialized]);

  useEffect(() => {
    if (!isLoading && !session?.user?.id) {
      toast({
        variant: 'destructive',
        title: '访问失败',
        description: '请先登录'
      });
      router.push('/login');
      return;
    }
  }, [isLoading, session, router, toast]);

  if (isLoading || !session?.user?.id) {
    return <div className="flex items-center justify-center h-screen">加载中...</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData: SubmitData = {
        member_no: formData.member_no,
        nickname: formData.nickname,
        wechat: formData.wechat,
        phone: formData.phone,
        province: formData.province,
        city: formData.city,
        district: formData.district,
        hukou_province: formData.hukou_province,
        hukou_city: formData.hukou_city,
        gender: formData.gender,
        target_area: formData.target_area,
        birth_year: formData.birth_year ? parseInt(formData.birth_year) : null,
        height: formData.height ? parseInt(formData.height) : null,
        weight: formData.weight ? parseInt(formData.weight) : null,
        education: formData.education,
        occupation: formData.occupation,
        house_car: formData.house_car,
        marriage_history: formData.marriage_history,
        sexual_orientation: formData.sexual_orientation,
        children_plan: formData.children_plan,
        marriage_cert: formData.marriage_cert,
        self_description: formData.self_description,
        partner_requirement: formData.partner_requirement
      };

      const response = await fetch(`/api/members/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '更新失败');
      }

      const localStorageKey = `editMemberFormData_${params.id}`;
      localStorage.removeItem(localStorageKey);

      toast({
        title: '更新成功',
        description: '会员信息已更新'
      });

      router.push('/members');
    } catch (error) {
      console.error('更新失败:', error);
      toast({
        variant: 'destructive',
        title: '更新失败',
        description: error instanceof Error ? error.message : '操作失败，请重试'
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
      console.log(`编辑页面下拉框 ${field} 值更新为:`, value);
      
      // 立即保存到localStorage，确保下拉框值不会丢失
      if (formInitialized && dataLoaded && params.id) {
        const updatedFormData = { ...formData, [field]: value };
        try {
          const localStorageKey = `editMemberFormData_${params.id}`;
          localStorage.setItem(localStorageKey, JSON.stringify(updatedFormData));
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

  const handleClearForm = () => {
    if (params.id) {
      const localStorageKey = `editMemberFormData_${params.id}`;
      localStorage.removeItem(localStorageKey);
      fetchMemberData();
      
      toast({
        title: '表单已重置',
        description: '所有修改已撤销，恢复原始数据'
      });
    }
  };

  const handleRefreshData = () => {
    if (params.id) {
      const localStorageKey = `editMemberFormData_${params.id}`;
      localStorage.removeItem(localStorageKey);
      fetchMemberData();
      
      toast({
        title: '数据已刷新',
        description: '已从服务器重新获取最新数据'
      });
    }
  };

  return (
    <div className="overflow-auto">
      <div className="max-w-[1200px] mx-auto p-6">
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
            <h2 className="text-lg font-semibold">编辑会员</h2>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshData}
            >
              刷新数据
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearForm}
            >
              重置表单
            </Button>
          </div>
        </div>
        <Card className="border-none shadow-none p-6">
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
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">微信昵称</label>
                    <Input
                      value={formData.nickname}
                      onChange={(e) => handleInputChange('nickname', e.target.value)}
                      placeholder="请输入微信昵称"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">性别</label>
                    <Select 
                      value={formData.gender} 
                      onValueChange={(value) => handleInputChange('gender', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="请选择性别" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">男</SelectItem>
                        <SelectItem value="female">女</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">出生年份</label>
                    <Input
                      type="number"
                      value={formData.birth_year}
                      onChange={(e) => handleInputChange('birth_year', e.target.value)}
                      onBlur={() => handleInputBlur('birth_year')}
                      placeholder="请输入出生年份"
                      className={`${fieldErrors.birth_year ? 'border-red-500 focus:border-red-500' : ''}`}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">身高(cm)</label>
                    <Input
                      type="number"
                      value={formData.height}
                      onChange={(e) => handleInputChange('height', e.target.value)}
                      onBlur={() => handleInputBlur('height')}
                      placeholder="请输入身高"
                      className={`${fieldErrors.height ? 'border-red-500 focus:border-red-500' : ''}`}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">体重(kg)</label>
                    <Input
                      type="number"
                      value={formData.weight}
                      onChange={(e) => handleInputChange('weight', e.target.value)}
                      onBlur={() => handleInputBlur('weight')}
                      placeholder="请输入体重"
                      className={`${fieldErrors.weight ? 'border-red-500 focus:border-red-500' : ''}`}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">所在省份</label>
                    <Input
                      value={formData.province}
                      onChange={(e) => handleInputChange('province', e.target.value)}
                      placeholder="请输入所在省份"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">所在城市</label>
                    <Input
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="请输入所在城市"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">所在区市</label>
                    <Input
                      value={formData.district}
                      onChange={(e) => handleInputChange('district', e.target.value)}
                      placeholder="请输入所在区市"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">户口所在省</label>
                    <Input
                      value={formData.hukou_province}
                      onChange={(e) => handleInputChange('hukou_province', e.target.value)}
                      placeholder="请输入户口所在省"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">户口所在市</label>
                    <Input
                      value={formData.hukou_city}
                      onChange={(e) => handleInputChange('hukou_city', e.target.value)}
                      placeholder="请输入户口所在市"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">学历</label>
                    <Select 
                      value={formData.education} 
                      onValueChange={(value) => handleInputChange('education', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="请选择学历" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HIGH_SCHOOL">高中</SelectItem>
                        <SelectItem value="JUNIOR_COLLEGE">专科</SelectItem>
                        <SelectItem value="COLLEGE">大专</SelectItem>
                        <SelectItem value="BACHELOR">本科</SelectItem>
                        <SelectItem value="MASTER">硕士</SelectItem>
                        <SelectItem value="PHD">博士</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">职业</label>
                    <Input
                      value={formData.occupation}
                      onChange={(e) => handleInputChange('occupation', e.target.value)}
                      placeholder="请输入职业"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">房车情况</label>
                    <Select 
                      value={formData.house_car} 
                      onValueChange={(value) => handleInputChange('house_car', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="请选择房车情况" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEITHER">无房无车</SelectItem>
                        <SelectItem value="HOUSE_ONLY">有房无车</SelectItem>
                        <SelectItem value="CAR_ONLY">有车无房</SelectItem>
                        <SelectItem value="BOTH">有房有车</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">婚史</label>
                    <Select 
                      value={formData.marriage_history} 
                      onValueChange={(value) => handleInputChange('marriage_history', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="请选择婚史" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="YES">有婚史</SelectItem>
                        <SelectItem value="NO">无婚史</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">性取向</label>
                    <Select 
                      value={formData.sexual_orientation} 
                      onValueChange={(value) => handleInputChange('sexual_orientation', value)}
                    >
                      <SelectTrigger>
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
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">手机号</label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="请输入手机号"
                    />
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
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">孩子需求</label>
                    <Select 
                      value={formData.children_plan} 
                      onValueChange={(value) => handleInputChange('children_plan', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="请选择孩子需求" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BOTH">一起要</SelectItem>
                        <SelectItem value="SEPARATE">各自要</SelectItem>
                        <SelectItem value="NEGOTIATE">互相协商</SelectItem>
                        <SelectItem value="NONE">不要</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">领证需求</label>
                    <Select 
                      value={formData.marriage_cert} 
                      onValueChange={(value) => handleInputChange('marriage_cert', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="请选择领证需求" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WANT">要</SelectItem>
                        <SelectItem value="DONT_WANT">不要</SelectItem>
                        <SelectItem value="NEGOTIATE">互相协商</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">自我介绍</label>
                    <textarea
                      value={formData.self_description}
                      onChange={(e) => handleInputChange('self_description', e.target.value)}
                      placeholder="请输入自我介绍"
                      className="w-full min-h-[100px] p-2 rounded-md border border-input bg-background"
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">期望对方</label>
                    <textarea
                      value={formData.partner_requirement}
                      onChange={(e) => handleInputChange('partner_requirement', e.target.value)}
                      placeholder="请输入择偶要求"
                      className="w-full min-h-[100px] p-2 rounded-md border border-input bg-background"
                    />
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
                重置
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-primary text-white"
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