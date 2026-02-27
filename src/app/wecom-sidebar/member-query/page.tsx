'use client';

import { useState } from 'react';
import { useWecomSidebarRuntime } from '../_lib/runtime';

type MemberDetail = {
  id?: number;
  member_no: string;
  nickname?: string | null;
  wechat?: string | null;
  phone?: string | null;
  gender?: string | null;
  type?: string | null;
  status?: string | null;
  province?: string | null;
  city?: string | null;
  district?: string | null;
  target_area?: string | null;
  birth_year?: number | null;
  height?: number | null;
  weight?: number | null;
  education?: string | null;
  occupation?: string | null;
  house_car?: string | null;
  hukou_province?: string | null;
  hukou_city?: string | null;
  children_plan?: string | null;
  marriage_cert?: string | null;
  marriage_history?: string | null;
  sexual_orientation?: string | null;
  self_description?: string | null;
  partner_requirement?: string | null;
  remaining_matches?: number | null;
  created_at?: string;
  updated_at?: string;
};

const formatMemberCard = (m: MemberDetail): string => {
  const age = m.birth_year ? `${new Date().getFullYear() - m.birth_year}岁` : '';
  const location = [m.province, m.city, m.district].filter(Boolean).join(' ') || '-';
  const lines = [
    `👤 会员编号：${m.member_no}`,
    `性别：${m.gender || '-'}  ${age}`,
    `状态：${m.status || '-'}  类型：${m.type || '-'}`,
    `昵称：${m.nickname || '-'}`,
    `所在地：${location}`,
    `学历：${m.education || '-'}  职业：${m.occupation || '-'}`,
    `身高：${m.height ? `${m.height}cm` : '-'}  体重：${m.weight ? `${m.weight}kg` : '-'}`,
    `婚史：${m.marriage_history || '-'}`,
    `剩余匹配：${m.remaining_matches ?? '-'}次`,
    m.self_description ? `\n自我介绍：${m.self_description}` : '',
    m.partner_requirement ? `\n择偶要求：${m.partner_requirement}` : ''
  ];
  return lines.filter(Boolean).join('\n');
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <tr className="border-b border-gray-100 last:border-b-0">
    <td className="w-24 bg-gray-50 px-2 py-1.5 text-gray-500 text-xs">{label}</td>
    <td className="px-2 py-1.5 text-xs break-all">{value}</td>
  </tr>
);

export default function MemberQueryPage() {
  const runtime = useWecomSidebarRuntime();
  const [memberNo, setMemberNo] = useState('');
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [msgType, setMsgType] = useState<'info' | 'success' | 'error'>('info');

  const showMsg = (text: string, type: 'info' | 'success' | 'error' = 'info') => {
    setMessage(text);
    setMsgType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  const handleQuery = async () => {
    if (!memberNo.trim()) return;
    setLoading(true);
    setMessage('');
    setMember(null);
    try {
      const params = runtime.buildApiParams();
      params.set('member_no', memberNo.trim());
      params.set('detail', '1');
      const response = await fetch(`/api/wecom-sidebar/member?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '查询失败');
      if (!data.member) {
        showMsg('未找到该编号对应会员', 'error');
      } else {
        setMember(data.member);
      }
    } catch (error) {
      showMsg(error instanceof Error ? error.message : '查询失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCard = async () => {
    if (!member) return;
    setSendLoading(true);

    try {
      const channel = runtime.refreshSendChannel();
      const latestEntry = await runtime.refreshContext().catch(() => runtime.contextEntry);
      const content = formatMemberCard(member);

      // WeixinJSBridge 通道下 entry 可能是 unknown，但通道可用就允许发送
      const allowSend = runtime.canSendMessage || (!!channel && channel.includes('WeixinJSBridge'));

      if (!channel || !allowSend) {
        await navigator.clipboard.writeText(content);
        showMsg(`当前入口(${latestEntry})不支持直接发送，已复制会员名片，请粘贴到聊天框`, 'info');
        return;
      }

      await runtime.sendChatMessage({ msgtype: 'text', text: { content } });
      showMsg('会员名片已写入聊天框', 'success');
    } catch (error) {
      const content = member ? formatMemberCard(member) : '';
      if (content) await navigator.clipboard.writeText(content).catch(() => {});
      showMsg(`${error instanceof Error ? error.message : '发送失败'}，已复制到剪贴板`, 'error');
    } finally {
      setSendLoading(false);
    }
  };

  const handleOpenProfile = async () => {
    if (!member) return;
    try {
      // type=2 表示外部联系人，type=1 表示企业成员
      await runtime.openUserProfile(member.member_no, 2);
    } catch {
      showMsg('打开资料页失败，该功能需要在企业微信聊天工具栏中使用', 'error');
    }
  };

  const location = member
    ? [member.province, member.city, member.district].filter(Boolean).join(' ') || '-'
    : '';

  return (
    <div className="space-y-3">
      {/* 搜索框 */}
      <div className="rounded-lg border border-gray-200 bg-white p-3">
        <div className="mb-2 font-medium text-gray-700">会员信息查询</div>
        <div className="flex gap-2">
          <input
            value={memberNo}
            onChange={(e) => setMemberNo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
            placeholder="输入会员编号，例如 M17071"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          />
          <button
            onClick={handleQuery}
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '查询…' : '查询'}
          </button>
        </div>
      </div>

      {/* 会员卡片 */}
      {member && (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          {/* 卡片头部 */}
          <div className="bg-blue-600 p-3 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-base">{member.member_no}</div>
                <div className="text-xs text-blue-200 mt-0.5">
                  {member.nickname || '未填写昵称'} · {member.gender || '-'}
                  {member.birth_year ? ` · ${new Date().getFullYear() - member.birth_year}岁` : ''}
                </div>
              </div>
              <div className="text-right text-xs text-blue-100">
                <div>{member.status || '-'}</div>
                <div>{member.type || '-'}</div>
              </div>
            </div>
          </div>

          {/* 微信号高亮 */}
          <div className="border-b border-gray-100 bg-blue-50 px-3 py-2">
            <span className="text-xs text-gray-500">微信号：</span>
            <span className="font-medium text-blue-700">{member.wechat || '未填写'}</span>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2 p-3 border-b border-gray-100">
            <button
              onClick={handleSendCard}
              disabled={sendLoading}
              className="flex-1 rounded-md border border-blue-200 bg-blue-50 py-2 text-xs font-medium text-blue-600 hover:bg-blue-100 disabled:opacity-50"
            >
              {sendLoading ? '发送中…' : '📤 发送名片'}
            </button>
            <button
              onClick={handleOpenProfile}
              className="flex-1 rounded-md border border-gray-200 bg-gray-50 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              👤 打开资料页
            </button>
          </div>

          {/* 详细信息表格 */}
          <table className="w-full">
            <tbody>
              <InfoRow label="手机号" value={member.phone || '-'} />
              <InfoRow label="所在地" value={location} />
              <InfoRow
                label="户口所在地"
                value={[member.hukou_province, member.hukou_city].filter(Boolean).join(' ') || '-'}
              />
              <InfoRow label="目标区域" value={member.target_area || '-'} />
              <InfoRow label="学历" value={member.education || '-'} />
              <InfoRow label="职业" value={member.occupation || '-'} />
              <InfoRow
                label="身高/体重"
                value={`${member.height ? `${member.height}cm` : '-'} / ${member.weight ? `${member.weight}kg` : '-'}`}
              />
              <InfoRow label="房车情况" value={member.house_car || '-'} />
              <InfoRow label="婚史" value={member.marriage_history || '-'} />
              <InfoRow label="性取向" value={member.sexual_orientation || '-'} />
              <InfoRow label="孩子需求" value={member.children_plan || '-'} />
              <InfoRow label="领证需求" value={member.marriage_cert || '-'} />
              <InfoRow label="剩余匹配" value={`${member.remaining_matches ?? '-'} 次`} />
              {member.self_description && (
                <tr className="border-b border-gray-100">
                  <td className="w-24 bg-gray-50 px-2 py-1.5 text-gray-500 text-xs align-top">自我介绍</td>
                  <td className="px-2 py-1.5 text-xs whitespace-pre-wrap">{member.self_description}</td>
                </tr>
              )}
              {member.partner_requirement && (
                <tr className="border-b border-gray-100 last:border-b-0">
                  <td className="w-24 bg-gray-50 px-2 py-1.5 text-gray-500 text-xs align-top">择偶要求</td>
                  <td className="px-2 py-1.5 text-xs whitespace-pre-wrap">{member.partner_requirement}</td>
                </tr>
              )}
            </tbody>
          </table>
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
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {message}
        </div>
      )}
    </div>
  );
}
