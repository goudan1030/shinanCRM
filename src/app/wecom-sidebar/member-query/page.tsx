'use client';

import { useState } from 'react';
import { useWecomSidebarRuntime } from '../_lib/runtime';

type MemberDetail = {
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

const rows = (member: MemberDetail) => [
  ['会员编号', member.member_no || '-'],
  ['昵称', member.nickname || '-'],
  ['手机号', member.phone || '-'],
  ['状态', member.status || '-'],
  ['类型', member.type || '-'],
  ['性别', member.gender || '-'],
  ['出生年份', member.birth_year ? `${member.birth_year}` : '-'],
  ['身高', member.height ? `${member.height} cm` : '-'],
  ['体重', member.weight ? `${member.weight} kg` : '-'],
  ['学历', member.education || '-'],
  ['职业', member.occupation || '-'],
  ['所在地', `${member.province || ''} ${member.city || ''} ${member.district || ''}`.trim() || '-'],
  ['户口所在地', `${member.hukou_province || ''} ${member.hukou_city || ''}`.trim() || '-'],
  ['目标区域', member.target_area || '-'],
  ['房车情况', member.house_car || '-'],
  ['婚史', member.marriage_history || '-'],
  ['性取向', member.sexual_orientation || '-'],
  ['孩子需求', member.children_plan || '-'],
  ['领证需求', member.marriage_cert || '-'],
  ['剩余匹配次数', member.remaining_matches ?? '-'],
  ['自我介绍', member.self_description || '-'],
  ['择偶要求', member.partner_requirement || '-']
];

export default function MemberQueryPage() {
  const runtime = useWecomSidebarRuntime();
  const [memberNo, setMemberNo] = useState('');
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleQuery = async () => {
    if (!memberNo.trim()) return;
    setLoading(true);
    setMessage('');
    try {
      const params = runtime.buildApiParams();
      params.set('member_no', memberNo.trim());
      params.set('detail', '1');

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

  return (
    <section className="rounded-lg border border-gray-200 p-3">
      <div className="mb-2 font-semibold">用户信息</div>
      <div className="mb-2 flex gap-2">
        <input
          value={memberNo}
          onChange={(e) => setMemberNo(e.target.value)}
          placeholder="输入会员编号，例如 M17071"
          className="flex-1 rounded-md border border-gray-300 px-2 py-1.5"
        />
        <button onClick={handleQuery} disabled={loading} className="rounded-md border px-2.5 py-1.5">
          查询
        </button>
      </div>

      {member ? (
        <div className="space-y-2">
          <div className="rounded-md border border-blue-200 bg-blue-50 p-2">
            <div className="text-xs text-gray-500">微信号（单独展示）</div>
            <div className="font-medium text-blue-700">{member.wechat || '未填写'}</div>
          </div>

          <div className="overflow-hidden rounded-md border border-gray-200">
            <table className="w-full text-xs">
              <tbody>
                {rows(member).map(([label, value]) => (
                  <tr key={label as string} className="border-b border-gray-100 last:border-b-0">
                    <td className="w-28 bg-gray-50 px-2 py-1.5 text-gray-600">{label}</td>
                    <td className="px-2 py-1.5">{String(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-gray-500">暂无会员信息</div>
      )}

      {message && <div className="mt-3 text-blue-600">{message}</div>}
    </section>
  );
}
