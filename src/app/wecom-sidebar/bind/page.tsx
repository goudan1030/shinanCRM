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

type MsgType = 'info' | 'success' | 'error';

export default function BindPage() {
  const runtime = useWecomSidebarRuntime();
  const [memberNo, setMemberNo] = useState('');
  const [searchedMember, setSearchedMember] = useState<MemberInfo | null>(null);
  const [boundMember, setBoundMember] = useState<MemberInfo | null>(null);
  const [checkingBinding, setCheckingBinding] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [msgType, setMsgType] = useState<MsgType>('info');
  // 当自动获取 wecom_userid 失败时，允许手动输入
  const [manualUserId, setManualUserId] = useState('');

  const bindUserId = runtime.wecomUserId || runtime.toUserId || manualUserId.trim();

  const showMsg = (text: string, type: MsgType = 'info') => {
    setMessage(text);
    setMsgType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  const fetchBoundMember = async () => {
    if (!runtime.wecomUserId) {
      setCheckingBinding(false);
      return;
    }
    try {
      const params = runtime.buildApiParams();
      params.set('wecom_userid', runtime.wecomUserId);
      const response = await fetch(`/api/wecom-sidebar/member?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '获取绑定信息失败');
      setBoundMember(data.member || null);
    } catch (error) {
      showMsg(error instanceof Error ? error.message : '检查绑定失败', 'error');
    } finally {
      setCheckingBinding(false);
    }
  };

  useEffect(() => {
    setCheckingBinding(true);
    setBoundMember(null);
    fetchBoundMember();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime.wecomUserId, runtime.key]);

  const handleSearch = async () => {
    if (!memberNo.trim()) return;
    setLoading(true);
    setSearchedMember(null);
    try {
      const params = runtime.buildApiParams();
      params.set('member_no', memberNo.trim());
      const response = await fetch(`/api/wecom-sidebar/member?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '查询失败');
      setSearchedMember(data.member || null);
      if (!data.member) showMsg('未找到该编号对应会员', 'error');
    } catch (error) {
      showMsg(error instanceof Error ? error.message : '查询失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBind = async () => {
    if (!bindUserId) {
      showMsg(
        `缺少 wecom_userid，无法绑定。入口：${runtime.contextEntry}，客户ID状态：${runtime.contactStatus}`,
        'error'
      );
      return;
    }
    if (!memberNo.trim()) {
      showMsg('请先输入会员编号', 'error');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/wecom-sidebar/bind?${runtime.buildApiParams().toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wecom_userid: bindUserId, member_no: memberNo.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '绑定失败');
      setBoundMember(data.member || null);
      setSearchedMember(null);
      setMemberNo('');
      showMsg('绑定成功！', 'success');
    } catch (error) {
      showMsg(error instanceof Error ? error.message : '绑定失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUnbind = async () => {
    if (!bindUserId || !boundMember) return;
    if (!confirm(`确认解除 ${boundMember.member_no} 的绑定关系？`)) return;
    setLoading(true);
    try {
      const params = runtime.buildApiParams();
      params.set('wecom_userid', bindUserId);
      const response = await fetch(`/api/wecom-sidebar/bind?${params.toString()}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '解绑失败');
      setBoundMember(null);
      showMsg('已解除绑定', 'success');
    } catch (error) {
      showMsg(error instanceof Error ? error.message : '解绑失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProfile = async (userId: string) => {
    try {
      await runtime.openUserProfile(userId, 2);
    } catch {
      showMsg('打开资料页失败，该功能需在企业微信聊天工具栏中使用', 'error');
    }
  };

  const MemberCard = ({ m, showUnbind = false }: { m: MemberInfo; showUnbind?: boolean }) => (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="bg-green-600 px-3 py-2 text-white flex items-center justify-between">
        <div>
          <div className="font-semibold">{m.member_no}</div>
          <div className="text-xs text-green-200">{m.nickname || '未填写昵称'}</div>
        </div>
        <div className="text-right text-xs text-green-100">
          <div>{m.status || '-'}</div>
          <div>{m.type || '-'}</div>
        </div>
      </div>
      <div className="p-3 space-y-1.5 text-xs text-gray-600">
        <div><span className="text-gray-400">微信号：</span>{m.wechat || '未填写'}</div>
        <div><span className="text-gray-400">手机号：</span>{m.phone || '未填写'}</div>
        <div><span className="text-gray-400">性别：</span>{m.gender || '-'}</div>
        <div><span className="text-gray-400">城市：</span>{m.city || '-'}</div>
      </div>
      <div className="flex gap-2 border-t border-gray-100 p-3">
        <button
          onClick={() => handleOpenProfile(m.wechat || m.member_no)}
          className="flex-1 rounded-md border border-gray-200 bg-gray-50 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
        >
          👤 查看资料
        </button>
        {showUnbind && (
          <button
            onClick={handleUnbind}
            disabled={loading}
            className="flex-1 rounded-md border border-red-200 bg-red-50 py-1.5 text-xs text-red-500 hover:bg-red-100 disabled:opacity-50"
          >
            解除绑定
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* 客户信息 */}
      <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs">
        <div className="mb-2 font-medium text-gray-700">当前客户信息</div>
        <div className="space-y-1 text-gray-500">
          <div>
            wecom_userid：
            <span className={runtime.wecomUserId ? 'text-green-600' : 'text-orange-500'}>
              {runtime.wecomUserId || '未自动识别'}
            </span>
          </div>
          <div>上下文入口：<span>{runtime.contextEntry || 'unknown'}</span></div>
          <div className="leading-relaxed">客户ID状态：{runtime.contactStatus}</div>
        </div>

        {/* 自动识别失败时提供手动输入兜底 */}
        {!runtime.wecomUserId && (
          <div className="mt-2 space-y-1.5">
            <div className="rounded-md bg-orange-50 p-2 text-orange-600">
              自动获取客户ID失败（需要应用配置「客户联系」权限）。<br />
              可手动填入客户企微 external_userid 继续绑定：
            </div>
            <input
              value={manualUserId}
              onChange={(e) => setManualUserId(e.target.value.trim())}
              placeholder="粘贴客户 external_userid，如 wmXXXXXX"
              className="w-full rounded-md border border-orange-200 bg-orange-50 px-2 py-1.5 text-xs focus:border-orange-400 focus:outline-none"
            />
          </div>
        )}

        {bindUserId && bindUserId === manualUserId && (
          <div className="mt-1.5 text-xs text-blue-600">
            将使用手动输入的 ID：{manualUserId}
          </div>
        )}
      </div>

      {/* 已绑定展示 */}
      {checkingBinding ? (
        <div className="rounded-lg border border-gray-200 bg-white py-6 text-center text-sm text-gray-400">
          检查绑定状态中…
        </div>
      ) : boundMember ? (
        <div>
          <div className="mb-2 text-xs font-medium text-green-600">✓ 当前客户已绑定</div>
          <MemberCard m={boundMember} showUnbind />
        </div>
      ) : (
        <div>
          <div className="mb-2 text-xs font-medium text-orange-600">当前客户未绑定，请输入会员编号绑定</div>

          {/* 搜索 + 绑定 */}
          <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-3">
            <div className="flex gap-2">
              <input
                value={memberNo}
                onChange={(e) => setMemberNo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="输入会员编号，例如 M17071"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="rounded-md border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                查询
              </button>
            </div>

            {searchedMember ? (
              <div>
                <div className="mb-2 text-xs text-gray-500">查询结果：</div>
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <div className="bg-gray-100 px-3 py-2">
                    <div className="font-medium text-gray-800">{searchedMember.member_no}</div>
                    <div className="text-xs text-gray-500">{searchedMember.nickname || '未填写昵称'} · {searchedMember.gender || '-'} · {searchedMember.city || '-'}</div>
                  </div>
                  <div className="p-3 text-xs text-gray-600 space-y-1">
                    <div><span className="text-gray-400">微信号：</span>{searchedMember.wechat || '未填写'}</div>
                    <div><span className="text-gray-400">手机号：</span>{searchedMember.phone || '未填写'}</div>
                    <div><span className="text-gray-400">状态：</span>{searchedMember.status || '-'} · 类型：{searchedMember.type || '-'}</div>
                  </div>
                  <div className="border-t border-gray-100 p-3">
                    <button
                      onClick={handleBind}
                      disabled={loading || !bindUserId}
                      className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? '绑定中…' : `绑定到当前客户`}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 消息提示 */}
      {message && (
        <div
          className={[
            'rounded-lg border p-3 text-xs',
            msgType === 'success' && 'border-green-200 bg-green-50 text-green-700',
            msgType === 'error' && 'border-red-200 bg-red-50 text-red-700',
            msgType === 'info' && 'border-blue-200 bg-blue-50 text-blue-700'
          ].filter(Boolean).join(' ')}
        >
          {message}
        </div>
      )}
    </div>
  );
}
