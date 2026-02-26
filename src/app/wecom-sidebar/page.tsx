'use client';

import { useEffect, useState } from 'react';

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

type QuickReply = {
  id: number;
  category: string;
  title: string;
  trigger_text: string | null;
  reply_content: string;
};

export default function WecomSidebarPage() {
  const [memberNo, setMemberNo] = useState('');
  const [member, setMember] = useState<MemberInfo | null>(null);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [wecomUserId, setWecomUserId] = useState('');
  const [toUserId, setToUserId] = useState('');
  const [key, setKey] = useState('');
  const [rawQuery, setRawQuery] = useState('');
  const [wecomClientReady, setWecomClientReady] = useState(false);

  const pickFirstNonEmpty = (...values: Array<string | null | undefined>) => {
    for (const value of values) {
      const trimmed = (value || '').trim();
      if (trimmed) return trimmed;
    }
    return '';
  };

  const buildApiParams = () => {
    const p = new URLSearchParams();
    if (key) p.set('key', key);
    return p;
  };

  const fetchQuickReplies = async () => {
    const response = await fetch(`/api/wecom-sidebar/quick-replies?${buildApiParams().toString()}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '获取快捷回复失败');
    setQuickReplies(data.list || []);
  };

  const fetchBoundMember = async () => {
    if (!wecomUserId) return;
    const params = buildApiParams();
    params.set('wecom_userid', wecomUserId);
    const response = await fetch(`/api/wecom-sidebar/member?${params.toString()}`);
    const data = await response.json();
    if (response.ok && data.member) {
      setMember(data.member);
      setMemberNo(data.member.member_no || '');
    }
  };

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    setRawQuery(window.location.search || '');
    const resolvedWecomUserId = pickFirstNonEmpty(
      search.get('wecom_userid'),
      search.get('wecomUserId'),
      search.get('userid'),
      search.get('user_id'),
      search.get('follow_userid')
    );
    const target = pickFirstNonEmpty(
      search.get('to_userid'),
      search.get('toUserId'),
      search.get('touser'),
      search.get('receiver_userid'),
      resolvedWecomUserId
    );
    const accessKey = pickFirstNonEmpty(search.get('key'), search.get('access_key'));
    setWecomUserId(resolvedWecomUserId);
    setToUserId(target);
    setKey(accessKey);
    const wxQy = (window as any)?.wx?.qy;
    setWecomClientReady(Boolean(wxQy?.sendChatMessage));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopyDebugInfo = async () => {
    const debugText = [
      `raw_query: ${rawQuery || '(empty)'}`,
      `wecomUserId: ${wecomUserId || '(empty)'}`,
      `toUserId: ${toUserId || '(empty)'}`,
      `key: ${key ? '(exists)' : '(empty)'}`
    ].join('\n');
    await navigator.clipboard.writeText(debugText);
    setMessage('诊断信息已复制，可直接发给开发排查');
  };

  useEffect(() => {
    if (!key && !wecomUserId && !toUserId) return;
    fetchQuickReplies().catch((error) => setMessage(error.message));
    fetchBoundMember().catch((error) => setMessage(error.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, wecomUserId, toUserId]);

  const handleSearchMember = async () => {
    if (!memberNo.trim()) return;
    setLoading(true);
    setMessage('');
    try {
      const params = buildApiParams();
      params.set('member_no', memberNo.trim());
      const response = await fetch(`/api/wecom-sidebar/member?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '查询失败');
      setMember(data.member || null);
      if (!data.member) {
        setMessage('未找到该编号对应会员');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '查询失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBind = async () => {
    if (!wecomUserId) {
      setMessage('缺少 wecom_userid，无法绑定');
      return;
    }
    if (!memberNo.trim()) {
      setMessage('请先输入会员编号');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(`/api/wecom-sidebar/bind?${buildApiParams().toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wecom_userid: wecomUserId,
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

  const handleSendQuickReply = async (content: string) => {
    setLoading(true);
    setMessage('');
    try {
      const wxQy = (window as any)?.wx?.qy;
      if (wxQy?.sendChatMessage) {
        await new Promise<void>((resolve, reject) => {
          wxQy.sendChatMessage({
            msgtype: 'text',
            text: { content },
            success: () => resolve(),
            fail: (err: any) => reject(new Error(err?.errMsg || err?.errmsg || '企业微信会话发送失败'))
          });
        });
        setMessage('发送成功');
        return;
      }

      // 兜底：客户端会话发送不可用时，仍尝试旧的应用消息发送链路
      if (!toUserId) {
        await navigator.clipboard.writeText(content);
        setMessage('当前环境未提供会话发送能力，且未识别接收人UserID，已复制到剪贴板');
        return;
      }

      const response = await fetch(`/api/wecom-sidebar/send-quick-reply?${buildApiParams().toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_userid: toUserId, content })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '发送失败');
      setMessage('发送成功');
    } catch (error) {
      const fallback = content;
      await navigator.clipboard.writeText(fallback);
      setMessage(
        `${error instanceof Error ? error.message : '发送失败'}，已自动复制回复内容`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 text-sm leading-relaxed">
      <h2 className="mb-3 text-base font-semibold">企业微信侧边栏</h2>

      <section className="mb-3 rounded-lg border border-gray-200 p-3">
        <div className="mb-2 font-semibold">客户详情</div>
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
          <div className="rounded-md bg-gray-50 p-2">
            <div>编号：{member.member_no}</div>
            <div>昵称：{member.nickname || '未填写'}</div>
            <div>手机号：{member.phone || '未填写'}</div>
            <div>状态：{member.status || '未知'}</div>
            <div>类型：{member.type || '未知'}</div>
            <div>城市：{member.city || '未填写'}</div>
          </div>
        ) : (
          <div className="text-gray-500">暂无会员信息</div>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 p-3">
        <div className="mb-2 font-semibold">快捷回复</div>
        <div className="mb-2 text-xs text-gray-500">
          发送通道：{wecomClientReady ? '企业微信会话发送（推荐）' : '应用消息发送（兜底）'}
        </div>
        <div className="mb-2">
          <input
            value={toUserId}
            onChange={(e) => setToUserId(e.target.value.trim())}
            placeholder="接收人UserID（自动识别失败时可手动填写）"
            className="w-full rounded-md border border-gray-300 px-2 py-1.5"
          />
          <div className="mt-1 text-xs text-gray-500">
            已兼容参数：to_userid / wecom_userid / userid / user_id / follow_userid
          </div>
        </div>
        <div className="mb-2 rounded-md border border-dashed border-gray-300 bg-gray-50 p-2 text-xs text-gray-600">
          <div>识别到的 wecom_userid：{wecomUserId || '未识别'}</div>
          <div>识别到的 to_userid：{toUserId || '未识别'}</div>
          <button
            type="button"
            onClick={handleCopyDebugInfo}
            className="mt-1 rounded-md border px-2 py-1 text-xs"
          >
            复制诊断信息
          </button>
        </div>
        <div className="grid gap-2">
          {quickReplies.map((item) => (
            <div key={item.id} className="rounded-md border border-gray-200 p-2">
              <div className="font-medium">{item.title}</div>
              <div className="mb-1 text-xs text-gray-500">{item.category}</div>
              <div className="mb-1.5 whitespace-pre-wrap">{item.reply_content}</div>
              <button onClick={() => handleSendQuickReply(item.reply_content)} disabled={loading} className="rounded-md border px-2 py-1">
                发送
              </button>
            </div>
          ))}
          {quickReplies.length === 0 && <div className="text-gray-500">暂无快捷回复模板</div>}
        </div>
      </section>

      {message && (
        <div className="mt-3 text-blue-600">
          {message}
        </div>
      )}
    </div>
  );
}
