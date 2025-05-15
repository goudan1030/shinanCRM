'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { operationTypeMap, formatValuesObject } from '@/lib/operation-log-utils';
import { ArrowLeft, Copy, CheckCircle2, Edit } from 'lucide-react';
import Link from 'next/link';

interface Member {
  id: string;
  member_no: string;
  nickname: string;
  wechat: string;
  phone: string;
  type: string;
  status: string;
  province: string;
  city: string;
  district: string;
  gender: string;
  target_area: string;
  birth_year: number;
  height: number;
  weight: number;
  education: string;
  occupation: string;
  income: string;
  marriage: string;
  has_children: string;
  want_children: string;
  housing: string;
  car: string;
  smoking: string;
  drinking: string;
  partner_requirement: string;
  remaining_matches: number | null;
  success_time: string | null;
  success_reason: string | null;
  created_at: string;
  updated_at: string;
  self_description: string | null;
  house_car: string;
  hukou_province: string;
  hukou_city: string;
  marriage_history: string;
  sexual_orientation: string;
  children_plan: string;
  marriage_cert: string;
}

interface MemberValues {
  [key: string]: string | number | null;
}

interface MemberOperationLog {
  id: string;
  member_id: string;
  operation_type: string;
  old_values: MemberValues;
  new_values: MemberValues;
  reason: string | null;
  created_at: string;
  operator_id: string;
  operator_email?: string;
}

interface MemberDetailProps {
  memberId: string;
}

const getChildrenPlanText = (childrenPlan: string) => {
  switch (childrenPlan) {
    case 'BOTH':
    case 'TOGETHER':
      return '一起要';
    case 'SEPARATE':
      return '各自要';
    case 'NEGOTIATE':
    case 'NEGOTIABLE':
      return '互相协商';
    case 'NONE':
    case 'DONT_WANT':
      return '不要孩子';
    default:
      return '未知';
  }
};

const getMarriageCertText = (marriageCert: string) => {
  switch (marriageCert) {
    case 'WANT':
      return '要';
    case 'DONT_WANT':
      return '不要';
    case 'NEGOTIATE':
      return '互相协商';
    default:
      return '未知';
  }
};

export default function MemberDetail({ memberId }: MemberDetailProps) {
  const { toast } = useToast();
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [operationLogs, setOperationLogs] = useState<MemberOperationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  const getEducationText = (education: string) => {
    switch (education) {
      case 'HIGH_SCHOOL':
        return '高中';
      case 'COLLEGE':
        return '大专';
      case 'BACHELOR':
        return '本科';
      case 'MASTER':
        return '硕士';
      case 'PHD':
        return '博士';
      default:
        return '未知';
    }
  };

  const getHouseCarText = (houseCar: string) => {
    switch (houseCar) {
      case 'NEITHER':
        return '无房无车';
      case 'HOUSE_ONLY':
        return '有房无车';
      case 'CAR_ONLY':
        return '无房有车';
      case 'BOTH':
        return '有房有车';
      default:
        return '未知';
    }
  };

  const getMarriageHistoryText = (marriageHistory: string) => {
    switch (marriageHistory) {
      case 'YES':
        return '有婚史';
      case 'NO':
        return '无婚史';
      default:
        return '未知';
    }
  };

  const getSexualOrientationText = (sexualOrientation: string) => {
    switch (sexualOrientation) {
      case 'STRAIGHT_MALE':
        return '直男';
      case 'STRAIGHT_FEMALE':
        return '直女';
      case 'LES':
        return 'LES';
      case 'GAY':
        return 'GAY';
      case 'ASEXUAL':
        return '无性恋';
      default:
        return '未知';
    }
  };
  
  const fetchMember = useCallback(async () => {
    try {
      const response = await fetch(`/api/members/${memberId}`);
      const data = await response.json() as Member;

      if (!response.ok) {
        throw new Error((data as any).error || '获取会员信息失败');
      }

      setMember(data);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '获取会员信息失败',
        description: error instanceof Error ? error.message : '未知错误'
      });
    } finally {
      setLoading(false);
    }
  }, [memberId, toast]);

  const fetchOperationLogs = useCallback(async () => {
    try {
      const response = await fetch(`/api/members/${memberId}/logs`);
      const data = await response.json() as MemberOperationLog[];

      if (!response.ok) {
        throw new Error((data as any).error || '获取操作日志失败');
      }

      setOperationLogs(data);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '获取操作日志失败',
        description: error instanceof Error ? error.message : '未知错误'
      });
    }
  }, [memberId, toast]);

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/login');
      return;
    }

    fetchMember();
    fetchOperationLogs();
  }, [isLoading, session, router, fetchMember, fetchOperationLogs]);

  // 复制会员信息
  const copyMemberInfo = useCallback(() => {
    if (!member) return;
    
    // 构建要复制的信息，排除指定字段
    const info = [
      `会员编号：${member.member_no}`,
      `性别：${member.gender === 'male' ? '男' : '女'}`,
      `出生年份：${member.birth_year}年`,
      `身高：${member.height}cm`,
      `体重：${member.weight}kg`,
      `学历：${getEducationText(member.education)}`,
      `职业：${member.occupation || '-'}`,
      `所在地：${member.province} ${member.city} ${member.district}`,
      `户口所在地：${member.hukou_province} ${member.hukou_city}`,
      `目标区域：${member.target_area || '-'}`,
      `房车情况：${getHouseCarText(member.house_car)}`,
      `婚史：${getMarriageHistoryText(member.marriage_history)}`,
      `性取向：${getSexualOrientationText(member.sexual_orientation)}`,
      `孩子需求：${getChildrenPlanText(member.children_plan)}`,
      `领证需求：${getMarriageCertText(member.marriage_cert)}`,
    ];
    
    // 如果有个人说明，添加到复制信息中
    if (member.self_description) {
      info.push(`个人说明：${member.self_description}`);
    }
    
    // 如果有择偶要求，添加到复制信息中
    if (member.partner_requirement) {
      info.push(`择偶要求：${member.partner_requirement}`);
    }
    
    // 格式化会员信息为文本
    const text = info.join('\n');

    // 使用 Clipboard API 复制文本（仅在浏览器环境中执行）
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        })
        .catch((err: unknown) => {
          console.error('复制失败:', err);
          // 回退到传统复制方法
          fallbackCopyTextToClipboard(text);
        });
    } else {
      // 回退到传统复制方法（兼容性更好）
      fallbackCopyTextToClipboard(text);
    }
  }, [member, getEducationText, getHouseCarText, getMarriageHistoryText, getSexualOrientationText, getChildrenPlanText, getMarriageCertText]);

  // 传统复制方法（作为回退）
  const fallbackCopyTextToClipboard = (text: string) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      
      // 避免滚动到底部
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.position = 'fixed';
      
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      
      document.body.removeChild(textArea);
      
      if (successful) {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    } catch (err: unknown) {
      console.error('回退复制方法失败:', err);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">加载中...</div>;
  }

  if (!member) {
    return <div className="flex min-h-screen items-center justify-center">会员不存在</div>;
  }

  return (
    <div className="container p-4">
      <div className="flex items-center justify-between mb-6 py-4 border-b">
        <div className="flex items-center gap-2">
        <Link href="/members" className="hover:opacity-75">
          <ArrowLeft className="w-6 h-6" />
        </Link>
          <h1 className="text-lg font-semibold">基本信息</h1>
      </div>
        
        {/* 按钮组 */}
        <div className="flex gap-2">
          <button
            onClick={copyMemberInfo}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
          >
            {isCopied ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm">已复制</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span className="text-sm">复制信息</span>
              </>
            )}
          </button>
          
          <Link 
            href={`/members/${memberId}/edit`}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-600 rounded-md hover:bg-green-100 transition-colors"
          >
            <Edit className="w-4 h-4" />
            <span className="text-sm">编辑会员</span>
          </Link>
        </div>
      </div>
      
      {/* 基本信息表格 */}
      <div className="mb-8">
        <div className="bg-white rounded shadow-sm">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b">
                <td className="px-4 py-3 w-[150px] bg-gray-50">名称</td>
                <td className="px-4 py-3">{member.nickname || '-'}</td>
                <td className="px-4 py-3 w-[150px] bg-gray-50">乙方</td>
                <td className="px-4 py-3">{member.nickname || '-'}</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-3 bg-gray-50">会员编号</td>
                <td className="px-4 py-3">{member.member_no}</td>
                <td className="px-4 py-3 bg-gray-50">会员类型</td>
                <td className="px-4 py-3">
                  {member.type === 'NORMAL' ? '普通会员' : 
                   member.type === 'ONE_TIME' ? `一次性会员 (${member.remaining_matches}次)` : 
                   '年费会员'}
                </td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-3 bg-gray-50">会员状态</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    member.status === 'ACTIVE' 
                      ? 'bg-green-100 text-green-800' 
                      : member.status === 'REVOKED' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {member.status === 'ACTIVE' ? '激活' : member.status === 'REVOKED' ? '撤销' : '成功'}
                  </span>
                </td>
                <td className="px-4 py-3 bg-gray-50">性别</td>
                <td className="px-4 py-3">{member.gender === 'male' ? '男' : '女'}</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-3 bg-gray-50">所在地</td>
                <td className="px-4 py-3">{member.province} {member.city} {member.district}</td>
                <td className="px-4 py-3 bg-gray-50">户口所在地</td>
                <td className="px-4 py-3">{member.hukou_province} {member.hukou_city}</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-3 bg-gray-50">目标区域</td>
                <td className="px-4 py-3">{member.target_area || '-'}</td>
                <td className="px-4 py-3 bg-gray-50">出生年份</td>
                <td className="px-4 py-3">{member.birth_year}年</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-3 bg-gray-50">身高</td>
                <td className="px-4 py-3">{member.height}cm</td>
                <td className="px-4 py-3 bg-gray-50">体重</td>
                <td className="px-4 py-3">{member.weight}kg</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-3 bg-gray-50">学历</td>
                <td className="px-4 py-3">{getEducationText(member.education)}</td>
                <td className="px-4 py-3 bg-gray-50">职业</td>
                <td className="px-4 py-3">{member.occupation || '-'}</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-3 bg-gray-50">房车情况</td>
                <td className="px-4 py-3">{getHouseCarText(member.house_car)}</td>
                <td className="px-4 py-3 bg-gray-50">婚史</td>
                <td className="px-4 py-3">{getMarriageHistoryText(member.marriage_history)}</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-3 bg-gray-50">性取向</td>
                <td className="px-4 py-3">{getSexualOrientationText(member.sexual_orientation)}</td>
                <td className="px-4 py-3 bg-gray-50">孩子需求</td>
                <td className="px-4 py-3">{getChildrenPlanText(member.children_plan)}</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-3 bg-gray-50">领证需求</td>
                <td className="px-4 py-3">{getMarriageCertText(member.marriage_cert)}</td>
                <td className="px-4 py-3 bg-gray-50">微信号</td>
                <td className="px-4 py-3">{member.wechat || '-'}</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-3 bg-gray-50">手机号</td>
                <td className="px-4 py-3">{member.phone || '-'}</td>
                <td className="px-4 py-3 bg-gray-50">剩余匹配次数</td>
                <td className="px-4 py-3">{member.remaining_matches ?? '无限制'}</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-3 bg-gray-50">创建时间</td>
                <td className="px-4 py-3">{new Date(member.created_at).toLocaleString('zh-CN')}</td>
                <td className="px-4 py-3 bg-gray-50">更新时间</td>
                <td className="px-4 py-3">{new Date(member.updated_at).toLocaleString('zh-CN')}</td>
              </tr>
            {member.success_time && (
                <tr className="border-b">
                  <td className="px-4 py-3 bg-gray-50">成功时间</td>
                  <td className="px-4 py-3" colSpan={3}>{new Date(member.success_time).toLocaleString('zh-CN')}</td>
                </tr>
            )}
            {member.success_reason && (
                <tr className="border-b">
                  <td className="px-4 py-3 bg-gray-50">成功原因</td>
                  <td className="px-4 py-3" colSpan={3}>{member.success_reason}</td>
                </tr>
              )}
              {member.self_description && (
                <tr className="border-b">
                  <td className="px-4 py-3 bg-gray-50">个人说明</td>
                  <td className="px-4 py-3" colSpan={3}>{member.self_description}</td>
                </tr>
              )}
              <tr className="border-b">
                <td className="px-4 py-3 bg-gray-50">择偶要求</td>
                <td className="px-4 py-3" colSpan={3}>{member.partner_requirement || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      {/* 操作日志 */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4 py-2 border-b">
          <h2 className="text-lg font-semibold">操作日志</h2>
          </div>
        
        <div className="bg-white rounded shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="border-b">
                <th className="px-4 py-3 text-left font-medium">项目名称</th>
                <th className="px-4 py-3 text-left font-medium">操作人</th>
                <th className="px-4 py-3 text-left font-medium">创建时间</th>
              </tr>
            </thead>
            <tbody>
            {operationLogs.length > 0 ? (
              operationLogs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">{operationTypeMap[log.operation_type] || log.operation_type}</td>
                    <td className="px-4 py-3">{log.operator_email || '未知'}</td>
                    <td className="px-4 py-3">{new Date(log.created_at).toLocaleString('zh-CN')}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                    暂无操作记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          {operationLogs.length > 0 && (
            <div className="px-4 py-3 flex items-center justify-center border-t">
              <div className="text-sm">
                共 {operationLogs.length} 项数据
                      </div>
                      </div>
                    )}
                  </div>
      </div>
    </div>
  );
}