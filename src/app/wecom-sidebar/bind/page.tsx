'use client';

import { useEffect, useState } from 'react';
import { useWecomSidebarRuntime } from '../_lib/runtime';

type MemberInfo = {
  id: number;
  member_no: string;
  nickname: string | null;
  phone: string | null;
  wechat: string | null;
  gender: string | null;
  type: string | null;
  status: string | null;
  city: string | null;
};

export default function BindPage() {
  const runtime = useWecomSidebarRuntime();
  const [memberNo, setMemberNo] = useState('');
  const [member, setMember] = useState<MemberInfo | null>(null);
  const [hasBinding, setHasBinding] = useState(false);
  const [checkingBinding, setCheckingBinding] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchBoundMember = async () => {
    if (!runtime.wecomUserId) {
      setCheckingBinding(false);
      return;
    }
    const params = runtime.buildApiParams();
    params.set('wecom_userid', runtime.wecomUserId);
    const response = await fetch(`/api/wecom-sidebar/member?${params.toString()}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '获取已绑定信息失败');
    if (data.member) {
      setMember(data.member);
      setMemberNo(data.member.member_no || '');
      setHasBinding(true);
    } else {
      setHasBinding(false);
    }
    setCheckingBinding(false);
  };

  useEffect(() => {
    setCheckingBinding(true);
    fetchBoundMember().catch((error) => {
      setMessage(error.message);
      setCheckingBinding(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime.wecomUserId, runtime.key]);

  const handleSearchMember = async () => {
    if (!memberNo.trim()) return;
    setLoading(true);
    setMessage('');
    try {
      const params = runtime.buildApiParams();
      params.set('member_no', memberNo.trim());
      const response = await fetch(`/api/wecom-sidebar/member?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '查询失败');
      setMember(data.member || null);
      if (!data.member) setMessage('未找到该编号对应会员');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '查询失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBind = async () => {
    if (!runtime.wecomUserId) {
      setMessage('缺少 wecom_userid，无法绑定，请从客户侧边栏入口打开');
      return;
    }
    if (!memberNo.trim()) {
      setMessage('请先输入会员编号');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(`/api/wecom-sidebar/bind?${runtime.buildApiParams().toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wecom_userid: runtime.wecomUserId,
          member_no: memberNo.trim()
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '绑定失败');
      setMember(data.member || null);
      setMessage('绑定成功');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '绑定失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-lg border border-gray-200 p-3">
      <div className="mb-2 font-semibold">信息查询</div>
      <div className="mb-2 rounded-md border border-dashed border-gray-300 bg-gray-50 p-2 text-xs text-gray-600">
        <div>当前会话 wecom_userid：{runtime.wecomUserId || '未识别'}</div>
        <div>上下文入口：{runtime.contextEntry || 'unknown'}</div>
      </div>

      {checkingBinding ? (
        <div className="text-gray-500">正在检查绑定状态...</div>
      ) : hasBinding ? (
        <div className="space-y-2">
          <div className="text-xs text-green-700">当前用户已绑定，展示绑定会员信息：</div>
          <div className="rounded-md bg-gray-50 p-2 text-sm">
            <div>编号：{member?.member_no}</div>
            <div>昵称：{member?.nickname || '未填写'}</div>
            <div>微信号：{member?.wechat || '未填写'}</div>
            <div>手机号：{member?.phone || '未填写'}</div>
            <div>状态：{member?.status || '未知'}</div>
            <div>类型：{member?.type || '未知'}</div>
            <div>城市：{member?.city || '未填写'}</div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-orange-700">当前用户未绑定，请先输入会员编号进行绑定：</div>
          <div className="mb-2 flex gap-2">
            <input
              value={memberNo}
              onChange={(e) => setMemberNo(e.target.value)}
              placeholder="输入会员编号，例如 M17071"
              className="flex-1 rounded-md border border-gray-300 px-2 py-1.5"
            />
            <button onClick={handleSearchMember} disabled={loading} className="rounded-md border px-2.5 py-1.5">
              查询
            </button>
            <button onClick={handleBind} disabled={loading} className="rounded-md border px-2.5 py-1.5">
              绑定
            </button>
          </div>

          {member ? (
            <div className="rounded-md bg-gray-50 p-2 text-sm">
              <div>编号：{member.member_no}</div>
              <div>昵称：{member.nickname || '未填写'}</div>
              <div>微信号：{member.wechat || '未填写'}</div>
              <div>手机号：{member.phone || '未填写'}</div>
              <div>状态：{member.status || '未知'}</div>
              <div>类型：{member.type || '未知'}</div>
              <div>城市：{member.city || '未填写'}</div>
            </div>
          ) : (
            <div className="text-gray-500">请先查询并绑定会员</div>
          )}
        </div>
      )}

      {message && <div className="mt-3 text-blue-600">{message}</div>}
    </section>
  );
}
