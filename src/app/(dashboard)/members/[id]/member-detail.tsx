'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { operationTypeMap, formatValuesObject } from '@/lib/operation-log-utils';
import { ArrowLeft } from 'lucide-react';
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
}

interface MemberDetailProps {
  memberId: string;
}

export default function MemberDetail({ memberId }: MemberDetailProps) {
  const { toast } = useToast();
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [member, setMember] = useState<Member | null>(null);
  const [operationLogs, setOperationLogs] = useState<MemberOperationLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMember = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberId)
        .single();

      if (error) throw error;
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
  }, [memberId, supabase, toast]);

  const fetchMemberOperationLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('member_operation_logs')
        .select('*')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOperationLogs(data || []);
    } catch (error) {
      console.error('获取会员操作记录失败:', error);
      toast({
        variant: 'destructive',
        title: '获取会员操作记录失败',
        description: '无法加载操作记录，请重试'
      });
    }
  }, [memberId, supabase, toast]);

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/login');
    }
  }, [isLoading, session, router]);

  useEffect(() => {
    if (session) {
      fetchMember();
      fetchMemberOperationLogs();
    }
  }, [session, fetchMember, fetchMemberOperationLogs]);

  if (loading) {
    return <div>加载中...</div>;
  }

  if (!member) {
    return <div>会员不存在</div>;
  }

  // 添加字段映射函数
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
        return education;
    }
  };

  const getChildrenPlanText = (plan: string) => {
    switch (plan) {
      case 'TOGETHER':
        return '一起要';
      case 'SEPARATE':
        return '各自要';
      case 'NEGOTIABLE':
        return '互相协商';
      case 'DONT_WANT':
        return '不要';
      default:
        return plan;
    }
  };

  const getMarriageCertText = (cert: string) => {
    switch (cert) {
      case 'WANT':
        return '要';
      case 'DONT_WANT':
        return '不要';
      case 'NEGOTIABLE':
        return '互相协商';
      default:
        return cert;
    }
  };

  return (
    <div className="container mx-auto px-4">
      <div className="flex items-center gap-2 mb-6 py-4 border-b">
        <Link href="/members" className="hover:opacity-75">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-[13px] font-semibold">编号{member?.member_no}的用户详情</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 左侧：会员基本信息 */}
        <Card className="p-6">
          <h2 className="text-[13px] font-bold mb-6">会员基本信息</h2>
          <div className="space-y-4">
            <div className="text-[13px]"><span className="font-semibold">会员编号：</span>{member.member_no}</div>
            <div className="text-[13px]"><span className="font-semibold">会员类型：</span>{member.type === 'NORMAL' ? '普通会员' : member.type === 'ONE_TIME' ? '一次性会员' : '年费会员'}</div>
            <div className="text-[13px]"><span className="font-semibold">会员状态：</span>{member.status === 'ACTIVE' ? '已激活' : member.status === 'REVOKED' ? '已撤销' : member.status === 'SUCCESS' ? '已成功' : '未知'}</div>
            <div className="text-[13px]"><span className="font-semibold">性别：</span>{member.gender === 'male' ? '男' : '女'}</div>
            <div className="text-[13px]"><span className="font-semibold">出生年份：</span>{member.birth_year}年</div>
            <div className="text-[13px]"><span className="font-semibold">身高：</span>{member.height}cm</div>
            <div className="text-[13px]"><span className="font-semibold">体重：</span>{member.weight}kg</div>
            <div className="text-[13px]"><span className="font-semibold">学历：</span>{getEducationText(member.education)}</div>
            <div className="text-[13px]"><span className="font-semibold">职业：</span>{member.occupation}</div>
            <div className="text-[13px]"><span className="font-semibold">房车情况：</span>{member.house_car}</div>
            <div className="text-[13px]"><span className="font-semibold">所在地：</span>{member.province} {member.city} {member.district}</div>
            <div className="text-[13px]"><span className="font-semibold">户口所在地：</span>{member.hukou_province} {member.hukou_city}</div>
            <div className="text-[13px]"><span className="font-semibold">目标区域：</span>{member.target_area}</div>
            <div className="text-[13px]"><span className="font-semibold">婚史：</span>{member.marriage_history}</div>
            <div className="text-[13px]"><span className="font-semibold">性取向：</span>{member.sexual_orientation}</div>
            <div className="text-[13px]"><span className="font-semibold">孩子需求：</span>{getChildrenPlanText(member.children_plan)}</div>
            <div className="text-[13px]"><span className="font-semibold">领证需求：</span>{getMarriageCertText(member.marriage_cert)}</div>
            <div className="text-[13px]"><span className="font-semibold">微信号：</span>{member.wechat}</div>
            <div className="text-[13px]"><span className="font-semibold">手机号：</span>{member.phone}</div>
            {member.self_description && (
              <div className="text-[13px]"><span className="font-semibold">个人说明：</span>{member.self_description}</div>
            )}
            <div className="text-[13px]"><span className="font-semibold">择偶要求：</span>{member.partner_requirement}</div>
            <div className="text-[13px]"><span className="font-semibold">创建时间：</span>{new Date(member.created_at).toLocaleString()}</div>
            <div className="text-[13px]"><span className="font-semibold">更新时间：</span>{new Date(member.updated_at).toLocaleString()}</div>
            {member.success_time && (
              <div className="text-[13px]"><span className="font-semibold">成功时间：</span>{new Date(member.success_time).toLocaleString()}</div>
            )}
            {member.success_reason && (
              <div className="text-[13px]"><span className="font-semibold">成功原因：</span>{member.success_reason}</div>
            )}
          </div>
        </Card>

        {/* 右侧：操作记录 */}
        <Card className="p-6">
          <h2 className="text-[13px] font-bold mb-6">操作记录</h2>
          <div className="space-y-4">
            {operationLogs.map((log) => (
              <div key={log.id} className="border-b pb-4">
                <div className="text-[13px] font-semibold mb-2">{operationTypeMap[log.operation_type] || log.operation_type}</div>
                <div className="text-[13px] text-gray-600">
                  <div>操作时间：{new Date(log.created_at).toLocaleString()}</div>
                  {log.old_values && (
                    <div className="mt-2">
                      <div className="text-[13px] font-medium">修改前：</div>
                      <pre className="text-[13px] bg-gray-50 p-2 rounded mt-1">
                        {JSON.stringify(formatValuesObject(log.old_values), null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.new_values && (
                    <div className="mt-2">
                      <div className="text-[13px] font-medium">修改后：</div>
                      <pre className="text-[13px] bg-gray-50 p-2 rounded mt-1">
                        {JSON.stringify(formatValuesObject(log.new_values), null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.reason && (
                    <div className="mt-2">
                      <div className="text-[13px] font-medium">原因：</div>
                      <div className="text-[13px] mt-1">{log.reason}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
} 