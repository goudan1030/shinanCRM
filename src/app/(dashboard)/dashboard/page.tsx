'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Copy, CheckCircle2 } from 'lucide-react';

interface DailyTaskMember {
  id: number;
  member_no: string;
  nickname: string;
  wechat: string;
  phone: string;
  birth_year: number;
  height: number;
  weight: number;
  education: string;
  occupation: string;
  province: string;
  city: string;
  district: string;
  target_area: string;
  house_car: string;
  hukou_province: string;
  hukou_city: string;
  children_plan: string;
  marriage_cert: string;
  marriage_history: string;
  sexual_orientation: string;
  self_description: string;
  partner_requirement: string;
}

export default function DashboardPage() {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [totalMembers, setTotalMembers] = useState<number>(0);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [inactiveUsers, setInactiveUsers] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  
  // 每日任务相关状态
  const [currentMembers, setCurrentMembers] = useState<DailyTaskMember[]>([]);
  const [copiedMemberId, setCopiedMemberId] = useState<number | null>(null);
  const [taskStatus, setTaskStatus] = useState<{
    isCompleted: boolean;
    publishedCount: number;
    totalCount: number;
  } | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/login');
    }
  }, [isLoading, session, router]);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        // 并行请求所有数据
        const [membersResponse, usersResponse, inactiveResponse] = await Promise.all([
          fetch('/api/dashboard/members/count'),
          fetch('/api/dashboard/users/count'),
          fetch('/api/dashboard/users/inactive')
        ]);

        const [membersData, usersData, inactiveData] = await Promise.all([
          membersResponse.json(),
          usersResponse.json(),
          inactiveResponse.json()
        ]);

        setTotalMembers(membersResponse.ok && membersData.count ? membersData.count : 0);
        setTotalUsers(usersResponse.ok && usersData.count ? usersData.count : 0);
        setInactiveUsers(inactiveResponse.ok && inactiveData.count ? inactiveData.count : 0);
      } catch (error) {
        console.error('获取仪表盘数据失败:', error);
      } finally {
        setLoading(false);
      }
    }

    if (session) {
      fetchDashboardData();
      fetchDailyTaskStatus();
      fetchNextMembers();
    }
  }, [session]);

  // 获取每日任务状态
  const fetchDailyTaskStatus = async () => {
    try {
      const response = await fetch('/api/dashboard/daily-task/status');
      const data = await response.json();
      if (response.ok && data.success) {
        setTaskStatus(data.data);
      }
    } catch (error) {
      console.error('获取任务状态失败:', error);
    }
  };

  // 辅助函数：格式化文本
  const getEducationText = (education: string) => {
    if (!education) return '未填写';
    switch (education) {
      case 'PRIMARY_SCHOOL': return '小学';
      case 'MIDDLE_SCHOOL': return '初中';
      case 'HIGH_SCHOOL': return '高中';
      case 'JUNIOR_COLLEGE': return '专科';
      case 'COLLEGE': return '大专';
      case 'BACHELOR': return '本科';
      case 'MASTER': return '硕士';
      case 'DOCTOR': return '博士';
      case 'PHD': return '博士';
      default: return education;
    }
  };

  const getHouseCarText = (houseCar: string) => {
    switch (houseCar) {
      case 'NEITHER': return '无房无车';
      case 'HOUSE_ONLY': return '有房无车';
      case 'CAR_ONLY': return '有车无房';
      case 'BOTH': return '有房有车';
      default: return houseCar || '未填写';
    }
  };

  const getMarriageHistoryText = (marriageHistory: string) => {
    if (!marriageHistory) return '未填写';
    switch (marriageHistory) {
      case 'YES': return '有婚史';
      case 'NO': return '无婚史';
      case 'HAS_HISTORY': return '有婚史';
      case 'NO_HISTORY': return '无婚史';
      default: return marriageHistory;
    }
  };

  const getSexualOrientationText = (sexualOrientation: string) => {
    if (!sexualOrientation) return '未填写';
    const orientationMap: Record<string, string> = {
      'STRAIGHT_MALE': '直男',
      'STRAIGHT_FEMALE': '直女',
      'LES': 'LES',
      'GAY': 'GAY',
      'ASEXUAL': '无性恋'
    };
    return orientationMap[sexualOrientation] || sexualOrientation;
  };

  const getChildrenPlanText = (childrenPlan: string) => {
    switch (childrenPlan) {
      case 'BOTH': return '一起要';
      case 'SEPARATE': return '各自要';
      case 'NEGOTIATE': return '互相协商';
      case 'NONE': return '不要孩子';
      default: return '未知';
    }
  };

  const getMarriageCertText = (marriageCert: string) => {
    switch (marriageCert) {
      case 'WANT': return '要';
      case 'DONT_WANT': return '不要';
      case 'NEGOTIABLE': return '互相协商';
      default: return '未知';
    }
  };

  // 复制会员信息（与会员列表逻辑一致）
  const copyMemberInfo = useCallback(async (member: DailyTaskMember) => {
    try {
      // 首先获取完整的会员详情，以确保获得所有字段
      const response = await fetch(`/api/members/${member.id}`);
      if (!response.ok) {
        throw new Error('获取会员详细信息失败');
      }
      
      const fullMember = await response.json();
      
      // 构建固定格式的复制信息
      const info = [
        `会员编号：${fullMember.member_no}`,
        `性别：${fullMember.gender === 'male' ? '男' : '女'}`,
        `出生年份：${fullMember.birth_year}年`,
        `身高：${fullMember.height}cm`,
        `体重：${fullMember.weight}kg`,
        `学历：${getEducationText(fullMember.education)}`,
        `职业：${fullMember.occupation || '-'}`,
        `所在地：${fullMember.province} ${fullMember.city} ${fullMember.district}`,
        `户口所在地：${fullMember.hukou_province} ${fullMember.hukou_city}`,
        `目标区域：${fullMember.target_area || '-'}`,
        `房车情况：${getHouseCarText(fullMember.house_car)}`,
        `婚史：${getMarriageHistoryText(fullMember.marriage_history)}`,
        `性取向：${getSexualOrientationText(fullMember.sexual_orientation)}`,
        `孩子需求：${getChildrenPlanText(fullMember.children_plan)}`,
        `领证需求：${getMarriageCertText(fullMember.marriage_cert)}`,
      ];
      
      // 添加个人说明
      if (fullMember.self_description) {
        info.push(`个人说明：${fullMember.self_description}`);
      }
      
      // 添加择偶要求
      if (fullMember.partner_requirement) {
        info.push(`择偶要求：${fullMember.partner_requirement}`);
      }
      
      // 复制到剪贴板
      const text = info.join('\n');
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopiedMemberId(member.id);
        setTimeout(() => setCopiedMemberId(null), 2000);
        toast({
          title: "复制成功",
          description: "会员基本信息已复制到剪贴板"
        });
      } else {
        // 备用方案
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopiedMemberId(member.id);
        setTimeout(() => setCopiedMemberId(null), 2000);
        toast({
          title: "复制成功",
          description: "会员基本信息已复制到剪贴板"
        });
      }
    } catch (error) {
      console.error('复制会员信息失败:', error);
      toast({
        variant: 'destructive',
        title: "复制失败",
        description: error instanceof Error ? error.message : "未知错误"
      });
    }
  }, [toast]);

  // 获取要发布的女生列表（20个）
  const fetchNextMembers = async () => {
    try {
      setTaskLoading(true);
      const response = await fetch('/api/dashboard/daily-task/next');
      const data = await response.json();
      if (response.ok && data.success) {
        setCurrentMembers(data.data.members || []);
        setTaskStatus(prev => prev ? {
          ...prev,
          publishedCount: data.data.publishedCount,
          totalCount: data.data.totalCount
        } : null);
      } else {
        setCurrentMembers([]);
      }
    } catch (error) {
      console.error('获取女生列表失败:', error);
    } finally {
      setTaskLoading(false);
    }
  };

  // 标记单个会员已发布
  const handlePublish = async (memberId: number, memberNo: string) => {
    try {
      setTaskLoading(true);
      const response = await fetch('/api/dashboard/daily-task/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ memberId }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast({
          title: '发布成功',
          description: `已标记 ${memberNo} 为已发布`,
        });
        await fetchDailyTaskStatus();
        // 从列表中移除已发布的会员
        setCurrentMembers(prev => prev.filter(m => m.id !== memberId));
        // 如果列表为空，获取下一批
        if (currentMembers.length <= 1) {
          await fetchNextMembers();
        }
      } else {
        toast({
          variant: 'destructive',
          title: '发布失败',
          description: data.error || '标记发布失败',
        });
      }
    } catch (error) {
      console.error('标记发布失败:', error);
      toast({
        variant: 'destructive',
        title: '发布失败',
        description: '网络错误，请重试',
      });
    } finally {
      setTaskLoading(false);
    }
  };

  // 完成今日任务
  const handleComplete = async () => {
    try {
      setTaskLoading(true);
      const response = await fetch('/api/dashboard/daily-task/complete', {
        method: 'POST',
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast({
          title: '任务完成',
          description: `今日已发布 ${data.data.totalPublished} 个女生信息`,
        });
        await fetchDailyTaskStatus();
        setCurrentMembers([]);
      } else {
        toast({
          variant: 'destructive',
          title: '完成失败',
          description: data.error || '标记完成失败',
        });
      }
    } catch (error) {
      console.error('标记完成失败:', error);
      toast({
        variant: 'destructive',
        title: '完成失败',
        description: '网络错误，请重试',
      });
    } finally {
      setTaskLoading(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6 lg:space-y-8">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight">仪表盘</h1>
      
      {/* 数据卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        <Card>
          <CardHeader className="space-y-1 sm:space-y-2 p-4 sm:p-6">
            <CardTitle className="text-sm sm:text-base font-medium text-muted-foreground">总会员数</CardTitle>
            <CardDescription className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">{totalMembers}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-1 sm:space-y-2 p-4 sm:p-6">
            <CardTitle className="text-sm sm:text-base font-medium text-muted-foreground">用户数</CardTitle>
            <CardDescription className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">{totalUsers}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-1 sm:space-y-2 p-4 sm:p-6">
            <CardTitle className="text-sm sm:text-base font-medium text-muted-foreground">未激活数量</CardTitle>
            <CardDescription className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">{inactiveUsers}</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* 每日任务卡片 */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg font-semibold">每日任务</CardTitle>
          <CardDescription>
            {taskStatus && (
              <span>
                今日已发布: {taskStatus.publishedCount} / {taskStatus.totalCount}
                {taskStatus.isCompleted && (
                  <span className="ml-2 text-green-600 font-medium">✓ 已完成</span>
                )}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {taskStatus?.isCompleted ? (
            <div className="text-center py-8">
              <p className="text-lg text-muted-foreground mb-4">今日任务已完成！</p>
              <p className="text-sm text-muted-foreground">
                今日共发布 {taskStatus.publishedCount} 个女生信息
              </p>
            </div>
          ) : currentMembers.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentMembers.map((member) => (
                  <div key={member.id} className="bg-muted/50 rounded-lg p-4 space-y-2 border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">会员编号:</span>
                      <span className="text-sm">{member.member_no}</span>
                    </div>
                    {member.nickname && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">昵称:</span>
                        <span className="text-sm">{member.nickname}</span>
                      </div>
                    )}
                    {member.birth_year && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">出生年份:</span>
                        <span className="text-sm">{member.birth_year}年</span>
                      </div>
                    )}
                    {member.height && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">身高:</span>
                        <span className="text-sm">{member.height}cm</span>
                      </div>
                    )}
                    {member.weight && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">体重:</span>
                        <span className="text-sm">{member.weight}kg</span>
                      </div>
                    )}
                    {member.city && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">所在地:</span>
                        <span className="text-sm">
                          {member.province || ''}{member.city || ''}{member.district || ''}
                        </span>
                      </div>
                    )}
                    {member.education && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">学历:</span>
                        <span className="text-sm">{getEducationText(member.education)}</span>
                      </div>
                    )}
                    {member.occupation && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">职业:</span>
                        <span className="text-sm">{member.occupation}</span>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2 border-t">
                      <Button 
                        onClick={() => copyMemberInfo(member)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        {copiedMemberId === member.id ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            已复制
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-1" />
                            复制
                          </>
                        )}
                      </Button>
                      <Button 
                        onClick={() => handlePublish(member.id, member.member_no)} 
                        disabled={taskLoading}
                        size="sm"
                        className="flex-1"
                      >
                        {taskLoading ? '处理中...' : '已发布'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-2">
                <Button 
                  onClick={handleComplete} 
                  disabled={taskLoading || (taskStatus && taskStatus.publishedCount === 0)}
                  variant="outline"
                >
                  完成今日任务
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {taskLoading ? '加载中...' : '暂无可发布的女生信息'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}