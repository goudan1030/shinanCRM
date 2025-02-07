'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
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
  target_area: text;
  birth_year: number;
  height: number;
  weight: number;
  education: string;
  occupation: string;
  house_car: string;
  hukou_province: string;
  hukou_city: string;
  children_plan: string;
  marriage_cert: string;
  self_description: text;
  partner_requirement: text;
  remaining_matches: number | null;
  success_time: string | null;
  success_reason: string | null;
  created_at: string;
  updated_at: string;
  wechat: string;
  phone: string;
}

const availableColumns = [
  { key: 'member_no', label: '会员编号' },
  { key: 'wechat', label: '微信号' },
  { key: 'phone', label: '手机号' },
  { key: 'type', label: '会员类型' },
  { key: 'status', label: '状态' },
  { key: 'gender', label: '性别' },
  { key: 'birth_year', label: '出生年份' },
  { key: 'height', label: '身高' },
  { key: 'weight', label: '体重' },
  { key: 'education', label: '学历' },
  { key: 'occupation', label: '职业' },
  { key: 'province', label: '所在省份' },
  { key: 'city', label: '所在城市' },
  { key: 'district', label: '所在区市' },
  { key: 'target_area', label: '目标区域' },
  { key: 'house_car', label: '房车情况' },
  { key: 'hukou_province', label: '户口所在省' },
  { key: 'hukou_city', label: '户口所在市' },
  { key: 'children_plan', label: '孩子需求' },
  { key: 'marriage_cert', label: '领证需求' },
  { key: 'marriage_history', label: '婚史' },
  { key: 'sexual_orientation', label: '性取向' },
  { key: 'remaining_matches', label: '剩余匹配次数' },
  { key: 'created_at', label: '创建时间' },
  { key: 'actions', label: '操作' }
];

export default function MembersPage() {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedColumns, setSelectedColumns] = useState(['member_no', 'wechat', 'phone', 'type', 'status', 'actions']);
  const [tableWidth, setTableWidth] = useState('100%');
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
  const pageSize = 25;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.column-selector')) {
        setIsColumnSelectorOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleColumnChange = (columns: string[]) => {
    if (columns.length === 0) {
      // 至少保留一个字段
      return;
    }
    // 确保操作列始终在最后
    const columnsWithoutActions = columns.filter(col => col !== 'actions');
    if (columns.includes('actions')) {
      setSelectedColumns([...columnsWithoutActions, 'actions']);
    } else {
      setSelectedColumns(columnsWithoutActions);
    }
  };

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/login');
    }
  }, [isLoading, session, router]);

  useEffect(() => {
    if (session) {
      fetchMembers();
    }
  }, [session, searchKeyword, typeFilter, statusFilter, currentPage]);

  const fetchMembers = async () => {
    try {
      let query = supabase
        .from('members')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      if (searchKeyword) {
        query = query.or(
          `member_no.ilike.%${searchKeyword}%,` +
          `wechat.ilike.%${searchKeyword}%,` +
          `phone.ilike.%${searchKeyword}%,` +
          `self_description.ilike.%${searchKeyword}%`
        );
      }

      if (typeFilter && typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setMembers(data || []);
      if (count) {
        setTotalCount(count);
        setTotalPages(Math.ceil(count / pageSize));
      }
    } catch (error) {
      console.error('获取会员列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMemberTypeText = (type: string) => {
    switch (type) {
      case 'NORMAL':
        return '普通会员';
      case 'ONE_TIME':
        return '一次性会员';
      case 'ANNUAL':
        return '年费会员';
      default:
        return '未知类型';
    }
  };

  const getGenderText = (gender: string) => {
    return gender === 'male' ? '男' : '女';
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

  const getChildrenPlanText = (childrenPlan: string) => {
    switch (childrenPlan) {
      case 'BOTH':
        return '一起要';
      case 'SEPARATE':
        return '各自要';
      case 'NEGOTIATE':
        return '互相协商';
      case 'NONE':
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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getColumnWidth = (key: string) => {
    switch (key) {
      case 'member_no':
      case 'phone':
        return 'min-w-[120px]';
      case 'wechat':
        return 'min-w-[150px]';
      case 'type':
      case 'status':
      case 'gender':
        return 'min-w-[100px]';
      case 'birth_year':
      case 'height':
      case 'weight':
        return 'min-w-[80px]';
      case 'education':
      case 'occupation':
      case 'house_car':
      case 'children_plan':
      case 'marriage_cert':
      case 'marriage_history':
      case 'sexual_orientation':
        return 'min-w-[120px]';
      case 'province':
      case 'city':
      case 'district':
      case 'hukou_province':
      case 'hukou_city':
        return 'min-w-[100px]';
      case 'target_area':
      case 'self_description':
      case 'partner_requirement':
        return 'min-w-[200px]';
      case 'actions':
        return 'min-w-[180px]';
      default:
        return 'min-w-[120px]';
    }
  };

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center p-4">加载中...</div>;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-[40px] bg-white flex items-center px-4 space-x-2 border-b fixed top-[48px] right-0 left-[294px] z-50">
          <div className="relative column-selector">
            <Button
              variant="outline"
              className="flex items-center gap-2 text-[13px] h-[26px]"
              onClick={() => setIsColumnSelectorOpen(!isColumnSelectorOpen)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 3h18v18H3zM12 3v18M3 12h18" />
              </svg>
              显示字段
            </Button>
            {isColumnSelectorOpen && (
              <div className="absolute right-0 mt-2 p-4 border rounded-md shadow-lg bg-white z-10 min-w-[240px] column-selector">
                <h3 className="text-[13px] font-medium mb-2">选择显示字段</h3>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {availableColumns.map((column) => (
                    <label key={column.key} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={selectedColumns.includes(column.key)}
                        onChange={(e) => {
                          const newColumns = e.target.checked
                            ? [...selectedColumns, column.key]
                            : selectedColumns.filter(key => key !== column.key);
                          handleColumnChange(newColumns);
                        }}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-[13px]">{column.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Link href="/members/new">
            <Button className="bg-primary text-white text-[13px] h-[26px]">
              新增会员
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-4 text-[13px] mt-[40px]">加载中...</div>
        ) : members.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-[13px] mt-[40px]">暂无会员数据</div>
        ) : (
          <>
            <div className="overflow-auto flex-1 mt-[40px] pb-10">
              <div className="relative">
                <table className="w-full min-w-[1200px]">
                  <thead className="sticky top-0 bg-[#f2f2f2] z-40">
                    <tr className="border-b">
                      {selectedColumns.map((columnKey) => {
                        const column = availableColumns.find(col => col.key === columnKey);
                        const getColumnWidth = (key: string) => {
                          switch (key) {
                            case 'member_no':
                            case 'phone':
                              return 'min-w-[120px]';
                            case 'wechat':
                              return 'min-w-[150px]';
                            case 'type':
                            case 'status':
                            case 'gender':
                              return 'min-w-[100px]';
                            case 'birth_year':
                            case 'height':
                            case 'weight':
                              return 'min-w-[80px]';
                            case 'education':
                            case 'occupation':
                            case 'house_car':
                            case 'children_plan':
                            case 'marriage_cert':
                            case 'marriage_history':
                            case 'sexual_orientation':
                              return 'min-w-[120px]';
                            case 'province':
                            case 'city':
                            case 'district':
                            case 'hukou_province':
                            case 'hukou_city':
                              return 'min-w-[100px]';
                            case 'target_area':
                            case 'self_description':
                            case 'partner_requirement':
                              return 'min-w-[200px]';
                            default:
                              return 'min-w-[120px]';
                          }
                        };
                        return column ? (
                          <th key={column.key} className={`py-3 px-4 text-left text-[13px] whitespace-nowrap ${getColumnWidth(column.key)} ${columnKey === 'actions' ? 'sticky right-0 bg-[#f2f2f2] shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.15)]' : ''}`}>{column.label}</th>
                        ) : null;
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id} className="border-b hover:bg-gray-50 h-10">
                        {selectedColumns.map((columnKey) => (
                          <td key={columnKey} className={`py-3 px-4 text-[13px] whitespace-nowrap ${getColumnWidth(columnKey)} ${columnKey === 'actions' ? 'sticky right-0 bg-white shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.15)]' : ''}`}>
                            {columnKey === 'type' ? getMemberTypeText(member[columnKey]) :
                             columnKey === 'gender' ? getGenderText(member[columnKey]) :
                             columnKey === 'house_car' ? getHouseCarText(member[columnKey]) :
                             columnKey === 'children_plan' ? getChildrenPlanText(member[columnKey]) :
                             columnKey === 'marriage_cert' ? getMarriageCertText(member[columnKey]) :
                             columnKey === 'marriage_history' ? getMarriageHistoryText(member[columnKey]) :
                             columnKey === 'sexual_orientation' ? getSexualOrientationText(member[columnKey]) :
                             columnKey === 'education' ? getEducationText(member[columnKey]) :
                             columnKey === 'status' ? (
                              <span className={`px-2 py-1 rounded-full text-[13px] ${member.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : member.status === 'REVOKED' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                                {member.status === 'ACTIVE' ? '激活' : member.status === 'REVOKED' ? '撤销' : '成功'}
                              </span>
                             ) :
                             columnKey === 'actions' ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-[26px] text-[13px]"
                                  onClick={() => router.push(`/members/${member.id}`)}
                                >
                                  查看
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-[26px] text-[13px]"
                                  onClick={() => router.push(`/members/${member.id}/edit`)}
                                >
                                  编辑
                                </Button>
                                {member.status === 'ACTIVE' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-[26px] text-[13px] text-red-500 hover:text-red-500"
                                    onClick={() => handleRevoke(member.id)}
                                  >
                                    撤销
                                  </Button>
                                )}
                              </div>
                             ) :
                             member[columnKey]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="h-[36px] flex items-center justify-between border-t fixed bottom-0 left-[294px] right-0 bg-white z-50 px-4">
              <div className="text-[13px] text-gray-500">
                共 {totalCount} 条记录
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="text-[13px] h-[26px]"
                >
                  上一页
                </Button>
                <div className="flex items-center gap-1">
                  {(() => {
                    const pages = [];
                    const maxVisiblePages = 5;
                    const halfVisible = Math.floor(maxVisiblePages / 2);
                    
                    // 始终显示第一页
                    pages.push(
                      <Button
                        key={1}
                        variant={1 === currentPage ? "default" : "outline"}
                        onClick={() => handlePageChange(1)}
                        className="min-w-[40px] text-[13px] h-[26px]"
                      >
                        1
                      </Button>
                    );

                    let startPage = Math.max(2, currentPage - halfVisible);
                    let endPage = Math.min(totalPages - 1, currentPage + halfVisible);

                    // 调整以确保显示正确数量的页码
                    if (currentPage <= halfVisible + 1) {
                      endPage = Math.min(totalPages - 1, maxVisiblePages - 1);
                    } else if (currentPage >= totalPages - halfVisible) {
                      startPage = Math.max(2, totalPages - maxVisiblePages + 1);
                    }

                    // 添加前省略号
                    if (startPage > 2) {
                      pages.push(
                        <span key="ellipsis-start" className="px-2">...</span>
                      );
                    }

                    // 添加中间页码
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <Button
                          key={i}
                          variant={i === currentPage ? "default" : "outline"}
                          onClick={() => handlePageChange(i)}
                          className="min-w-[40px] text-[13px] h-[26px]"
                        >
                          {i}
                        </Button>
                      );
                    }

                    // 添加后省略号
                    if (endPage < totalPages - 1) {
                      pages.push(
                        <span key="ellipsis-end" className="px-2">...</span>
                      );
                    }

                    // 始终显示最后一页
                    if (totalPages > 1) {
                      pages.push(
                        <Button
                          key={totalPages}
                          variant={totalPages === currentPage ? "default" : "outline"}
                          onClick={() => handlePageChange(totalPages)}
                          className="min-w-[40px] text-[13px] h-[26px]"
                        >
                          {totalPages}
                        </Button>
                      );
                    }

                    return pages;
                  })()} 
                </div>
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="text-[13px] h-[26px]"
                >
                  下一页
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 搜索区域 */}
      <div className="hidden md:block fixed left-[54px] top-[48px] bottom-0 w-[240px] bg-white border-r p-4 transition-all duration-300 z-10">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[13px] font-medium">关键词搜索</label>
            <Input
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索会员编号/微信/手机号"
              className="text-[13px]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-medium">会员类型</label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="text-[13px]">
                <SelectValue placeholder="全部类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="NORMAL">普通会员</SelectItem>
                <SelectItem value="ONE_TIME">一次性会员</SelectItem>
                <SelectItem value="ANNUAL">年费会员</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-medium">会员状态</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="text-[13px]">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="ACTIVE">激活</SelectItem>
                <SelectItem value="REVOKED">撤销</SelectItem>
                <SelectItem value="SUCCESS">成功</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}