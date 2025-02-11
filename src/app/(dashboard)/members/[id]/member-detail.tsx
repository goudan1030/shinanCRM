'use client';

import React from 'react';
import { useState, useEffect, useCallback } from 'react';
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
  wechat: string;
  phone: string;
  self_description: string | null;
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
  id: string;
}

export default function MemberDetail({ id }: MemberDetailProps) {
  const { toast } = useToast();
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [member, setMember] = useState<Member | null>(null);
  const [operationLogs, setOperationLogs] = useState<MemberOperationLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMemberDetails = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setMember(data);
    } catch (error) {
      console.error('获取会员详情失败:', error);
      toast({
        variant: 'destructive',
        title: '获取会员详情失败',
        description: '无法加载会员信息，请重试'
      });
    } finally {
      setLoading(false);
    }
  }, [id, supabase, toast]);

  const fetchMemberOperationLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('member_operation_logs')
        .select('*')
        .eq('member_id', id)
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
  }, [id, supabase, toast]);

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/login');
    }
  }, [isLoading, session, router]);

  useEffect(() => {
    if (session) {
      fetchMemberDetails();
      fetchMemberOperationLogs();
    }
  }, [session, fetchMemberDetails, fetchMemberOperationLogs]);

  if (loading) {
    return <div>加载中...</div>;
  }

  if (!member) {
    return <div>会员不存在</div>;
  }

  return (
    <div className="container mx-auto px-4">
      <div className="flex items-center gap-2 mb-6 py-4 border-b">
        <Link href="/members" className="hover:opacity-75">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-semibold">编号{member?.member_no}的用户详情</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 左侧：会员基本信息 */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-6">会员基本信息</h2>
          <div className="space-y-4">
            <div><span className="font-semibold">会员编号：</span>{member.member_no}</div>
            <div><span className="font-semibold">会员类型：</span>{member.type === 'NORMAL' ? '普通会员' : member.type === 'ONE_TIME' ? '一次性会员' : '年费会员'}</div>
            <div><span className="font-semibold">会员状态：</span>{member.status === 'ACTIVE' ? '已激活' : member.status === 'REVOKED' ? '已撤销' : member.status === 'SUCCESS' ? '已成功' : '未知'}</div>
            <div><span className="font-semibold">性别：</span>{member.gender === 'male' ? '男' : '女'}</div>
            <div><span className="font-semibold">出生年份：</span>{member.birth_year}年</div>
            <div><span className="font-semibold">身高：</span>{member.height}cm</div>
            <div><span className="font-semibold">体重：</span>{member.weight}kg</div>
            <div><span className="font-semibold">学历：</span>{member.education}</div>
            <div><span className="font-semibold">职业：</span>{member.occupation}</div>
            <div><span className="font-semibold">房车情况：</span>{member.income} {member.marriage} {member.has_children} {member.want_children} {member.housing} {member.car}</div>
            <div><span className="font-semibold">所在地：</span>{member.province} {member.city} {member.district}</div>
            <div><span className="font-semibold">目标区域：</span>{member.target_area}</div>
            <div><span className="font-semibold">吸烟情况：</span>{member.smoking}</div>
            <div><span className="font-semibold">饮酒情况：</span>{member.drinking}</div>
            <div><span className="font-semibold">微信号：</span>{member.wechat}</div>
            <div><span className="font-semibold">手机号：</span>{member.phone}</div>
            {member.self_description && (
              <div><span className="font-semibold">个人说明：</span>{member.self_description}</div>
            )}
            <div><span className="font-semibold">择偶要求：</span>{member.partner_requirement}</div>
            <div><span className="font-semibold">创建时间：</span>{new Date(member.created_at).toLocaleString()}</div>
            <div><span className="font-semibold">更新时间：</span>{new Date(member.updated_at).toLocaleString()}</div>
            {member.success_time && (
              <div><span className="font-semibold">成功时间：</span>{new Date(member.success_time).toLocaleString()}</div>
            )}
            {member.success_reason && (
              <div><span className="font-semibold">成功原因：</span>{member.success_reason}</div>
            )}
          </div>
        </Card>

        {/* 右侧：操作记录 */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-6">操作记录</h2>
          <div className="space-y-4">
            {operationLogs.map((log) => (
              <div key={log.id} className="border-b pb-4">
                <div className="font-semibold text-lg mb-2">{operationTypeMap[log.operation_type] || log.operation_type}</div>
                <div className="text-sm text-gray-600">
                  <div>操作时间：{new Date(log.created_at).toLocaleString()}</div>
                  {log.old_values && (
                    <div className="mt-2">
                      <div className="font-medium">修改前：</div>
                      <pre className="text-xs bg-gray-50 p-2 rounded mt-1">
                        {JSON.stringify(formatValuesObject(log.old_values), null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.new_values && (
                    <div className="mt-2">
                      <div className="font-medium">修改后：</div>
                      <pre className="text-xs bg-gray-50 p-2 rounded mt-1">
                        {JSON.stringify(formatValuesObject(log.new_values), null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.reason && (
                    <div className="mt-2">
                      <div className="font-medium">原因：</div>
                      <div className="mt-1">{log.reason}</div>
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