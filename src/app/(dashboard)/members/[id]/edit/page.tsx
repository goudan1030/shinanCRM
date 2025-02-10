'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { ArrowLeft } from 'lucide-react';

export default function EditMemberPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClientComponentClient();
  const { toast } = useToast();
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
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

  useEffect(() => {
    const fetchMemberData = async () => {
      try {
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .eq('id', params.id)
          .single();

        if (error) throw error;

        if (data) {
          setFormData({
            member_no: data.member_no || '',
            nickname: data.nickname || '',
            wechat: data.wechat || '',
            phone: data.phone || '',
            province: data.province || '',
            city: data.city || '',
            district: data.district || '',
            gender: data.gender || '',
            target_area: data.target_area || '',
            birth_year: data.birth_year?.toString() || '',
            height: data.height?.toString() || '',
            weight: data.weight?.toString() || '',
            education: data.education || '',
            occupation: data.occupation || '',
            house_car: data.house_car || '',
            hukou_province: data.hukou_province || '',
            hukou_city: data.hukou_city || '',
            children_plan: data.children_plan || '',
            marriage_cert: data.marriage_cert || '',
            marriage_history: data.marriage_history || '',
            sexual_orientation: data.sexual_orientation || '',
            self_description: data.self_description || '',
            partner_requirement: data.partner_requirement || ''
          });
        }
      } catch (error) {
        console.error('获取会员信息失败:', error);
        toast({
          variant: 'destructive',
          title: '获取会员信息失败',
          description: '无法加载会员信息，请重试'
        });
      }
    };

    if (params.id) {
      fetchMemberData();
    }
  }, [params.id, supabase, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 验证手机号格式
    if (!/^1\d{10}$/.test(formData.phone)) {
      toast({
        variant: 'destructive',
        title: '更新会员失败',
        description: '请输入正确的11位手机号码'
      });
      setLoading(false);
      return;
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

    for (const { field, label } of requiredFields) {
      if (!formData[field]) {
        toast({
          variant: 'destructive',
          title: '更新会员失败',
          description: `${label}不能为空`
        });
        setLoading(false);
        return;
      }
    }

    try {
      // 处理提交数据，将空字符串转换为null
      const submitData = Object.entries(formData).reduce((acc, [key, value]) => {
        acc[key] = value === '' ? null : value;
        return acc;
      }, {});

      // 设置当前用户ID到数据库会话变量
      if (!session?.user?.id) {
        throw new Error('未登录或登录已过期，请重新登录');
      }

      // 先设置当前用户ID，并等待其完成
      const { error: setUserError } = await supabase.rpc('set_current_user_id', {
        user_id: session.user.id
      });

      if (setUserError) {
        throw new Error(`设置用户ID失败: ${setUserError.message}`);
      }

      // 然后再执行更新操作
      const { error } = await supabase
        .from('members')
        .update(submitData)
        .eq('id', params.id);

      if (error) {
        // 根据不同的错误类型显示相应的提示信息
        if (error.code === '23505') {
          throw new Error('会员编号或联系方式已存在，请检查后重试');
        } else if (error.code === '23502') {
          const columnMatch = error.message.match(/column "([^"]+)" of relation/);
          const column = columnMatch ? columnMatch[1] : null;
          const fieldLabel = requiredFields.find(f => f.field === column)?.label || column;
          throw new Error(`${fieldLabel}不能为空`);
        } else {
          console.error('保存失败:', error);
          throw new Error(`保存失败: ${error.message}`);
        }
      }

      toast({
        title: '更新成功',
        description: '会员信息已更新'
      });

      router.push('/members');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '更新会员失败',
        description: error instanceof Error ? error.message : '保存失败，请重试。如果问题持续存在，请联系管理员'
      });
    } finally {
      setLoading(false);
    }
  };

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    // 清除字段错误
    setFieldErrors(prev => ({ ...prev, [field]: '' }));
    
    // 处理数值类型字段
    if (['birth_year', 'height', 'weight'].includes(field)) {
      // 如果输入为空，设置为空字符串
      if (value.trim() === '') {
        setFormData(prev => ({ ...prev, [field]: '' }));
        return;
      }
      
      // 只允许输入数字
      if (!/^\d*$/.test(value)) {
        return;
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-bold">编辑会员</h2>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 表单内容保持不变 */}
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
                  <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
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
                  <Select value={formData.education} onValueChange={(value) => handleInputChange('education', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择学历" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HIGH_SCHOOL">高中</SelectItem>
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
                  <Select value={formData.house_car} onValueChange={(value) => handleInputChange('house_car', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择房车情况" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">无房无车</SelectItem>
                      <SelectItem value="HOUSE_ONLY">有房无车</SelectItem>
                      <SelectItem value="CAR_ONLY">有车无房</SelectItem>
                      <SelectItem value="BOTH">有房有车</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">婚史</label>
                  <Select value={formData.marriage_history} onValueChange={(value) => handleInputChange('marriage_history', value)}>
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
                  <Select value={formData.sexual_orientation} onValueChange={(value) => handleInputChange('sexual_orientation', value)}>
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
                  <Select value={formData.children_plan} onValueChange={(value) => handleInputChange('children_plan', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择孩子需求" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TOGETHER">一起要</SelectItem>
                      <SelectItem value="SEPARATE">各自要</SelectItem>
                      <SelectItem value="NEGOTIABLE">互相协商</SelectItem>
                      <SelectItem value="DONT_WANT">不要</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">领证需求</label>
                  <Select value={formData.marriage_cert} onValueChange={(value) => handleInputChange('marriage_cert', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择领证需求" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WANT">要</SelectItem>
                      <SelectItem value="DONT_WANT">不要</SelectItem>
                      <SelectItem value="NEGOTIABLE">互相协商</SelectItem>
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
          
          <div className="flex justify-end">
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
  );
}