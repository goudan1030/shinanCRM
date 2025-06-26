'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from 'react';
import { useDataTable } from '@/hooks/use-data-table';
import { Copy, CheckCircle2, QrCode, Download } from 'lucide-react';
import QRCode from 'qrcode';

// 自定义会话类型
interface SessionUser {
  id: number;
  email?: string;
  name?: string;
  role?: string;
}

interface Session {
  user?: SessionUser;
}

interface Member {
  id: string;
  member_no: string;
  nickname: string;
  wechat: string;
  phone: string;
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
  type: string;
  status: string;
  remaining_matches: number;
  created_at: string;
  house_car: string;
  hukou_province: string;
  hukou_city: string;
  children_plan: string;
  marriage_cert: string;
  marriage_history: string;
  sexual_orientation: string;
  self_description: string;
  wechat_qrcode: string;
  [key: string]: string | number;
}

// 首先定义一个类型来表示所有可能的列键
type ColumnKey = 'member_no' | 'wechat' | 'phone' | 'type' | 'status' | 'gender' | 'birth_year' | 
  'height' | 'weight' | 'education' | 'occupation' | 'province' | 'city' | 'district' | 
  'target_area' | 'house_car' | 'hukou_province' | 'hukou_city' | 'children_plan' | 
  'marriage_cert' | 'marriage_history' | 'sexual_orientation' | 'remaining_matches' | 
  'created_at' | 'actions' | 'self_description' | 'partner_requirement' | 'wechat_qrcode';

// 修改 availableColumns 的类型
const availableColumns: { key: ColumnKey; label: string }[] = [
  { key: 'member_no', label: '会员编号' },
  { key: 'wechat', label: '微信号' },
  { key: 'phone', label: '手机号' },
  { key: 'wechat_qrcode', label: '微信二维码' },
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
  { key: 'self_description', label: '个人说明' },
  { key: 'partner_requirement', label: '择偶要求' },
  { key: 'actions', label: '操作' }  // 将actions列固定在最后
];

function MembersPageContent() {
  const { toast } = useToast();
  const { session, isLoading } = useAuth() as { session: Session | null, isLoading: boolean };
  const router = useRouter();
  const searchParams = useSearchParams();
  const { updateFilters } = useDataTable({
    tableName: 'members',
    pageSize: 25,
    defaultSort: { column: 'created_at', ascending: false }
  });

  // 状态定义
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  // 从URL中获取页码，默认为1
  const initialPage = searchParams.get('page') ? parseInt(searchParams.get('page') as string) : 1;
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(25);
  
  // 添加筛选状态初始化标志
  const [filterInitialized, setFilterInitialized] = useState(false);
  
  // 状态定义，尝试从localStorage中获取
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [genderFilter, setGenderFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  
  // 从 localStorage 加载筛选项
  useEffect(() => {
    try {
      const savedFilters = localStorage.getItem('memberListFilters');
      if (savedFilters) {
        const parsedFilters = JSON.parse(savedFilters);
        
        // 设置筛选状态
        setStatusFilter(parsedFilters.status);
        setTypeFilter(parsedFilters.type);
        setGenderFilter(parsedFilters.gender);
        
        // 只有当搜索词不为空时才设置
        if (parsedFilters.search) {
          setSearchTerm(parsedFilters.search);
          setSearchKeyword(parsedFilters.search);
        }
        
        console.log('从 localStorage 恢复筛选项:', parsedFilters);
      }
      
      setFilterInitialized(true);
    } catch (error) {
      console.error('加载保存的筛选项失败:', error);
      setFilterInitialized(true);
    }
  }, []);
  
  // 保存筛选项到 localStorage
  useEffect(() => {
    if (filterInitialized) {
      const filtersToSave = {
        status: statusFilter,
        type: typeFilter,
        gender: genderFilter,
        search: searchTerm
      };
      
      localStorage.setItem('memberListFilters', JSON.stringify(filtersToSave));
      console.log('保存筛选项到 localStorage:', filtersToSave);
    }
  }, [statusFilter, typeFilter, genderFilter, searchTerm, filterInitialized]);
  
  const [memberCounts, setMemberCounts] = useState({ NORMAL: 0, ONE_TIME: 0, ANNUAL: 0 });
  const [selectedColumns, setSelectedColumns] = useState<ColumnKey[]>(() => {
    if (typeof window !== 'undefined') {
      const savedColumns = localStorage.getItem('memberTableColumns');
      if (savedColumns) {
        const parsedColumns = JSON.parse(savedColumns);
        // 确保操作列始终在最后
        const columnsWithoutActions = parsedColumns.filter((col: string) => col !== 'actions');
        return [...columnsWithoutActions, 'actions'];
      }
    }
    // 默认显示所有列，操作列在最后
    const defaultColumns = availableColumns.map(col => col.key).filter(col => col !== 'actions');
    return [...defaultColumns, 'actions'];
  });
  
  // 会员操作相关状态
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedMemberType, setSelectedMemberType] = useState<string | null>(null);
  const [upgradeType, setUpgradeType] = useState<'ONE_TIME' | 'ANNUAL'>('ONE_TIME');
  
  // 图片预览相关状态
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>('');
  const [upgradeDate, setUpgradeDate] = useState(new Date());
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeLoading, setRevokeLoading] = useState(false);
  
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [activateReason, setActivateReason] = useState('');
  const [activateLoading, setActivateLoading] = useState(false);
  
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [targetMemberNo, setTargetMemberNo] = useState('');
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [copiedMemberId, setCopiedMemberId] = useState<string | null>(null);
  const [copiedLinkMemberId, setCopiedLinkMemberId] = useState<string | null>(null);
  
  // 二维码相关状态
  const [qrCodeDialogOpen, setQrCodeDialogOpen] = useState(false);
  const [qrCodeGenerating, setQrCodeGenerating] = useState(false);
  const [qrCodePreviewUrl, setQrCodePreviewUrl] = useState<string | null>(null);
  const [selectedQrCodeMember, setSelectedQrCodeMember] = useState<Member | null>(null);

  // 分页计算
  const totalPages = Math.ceil(total / pageSize);

  // 数据获取逻辑
  const fetchMembers = useCallback(async () => {
    if (!filterInitialized) return; // 等待筛选项初始化完成
    
    try {
      setLoading(true);
      console.log('===== 开始获取会员列表 =====');
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString()
      });

      if (statusFilter) queryParams.set('status', statusFilter);
      if (genderFilter) queryParams.set('gender', genderFilter);
      if (searchTerm) queryParams.set('search', searchTerm);
      if (typeFilter) queryParams.set('type', typeFilter);
      
      // 使用统一的API端点，通过查询参数处理筛选
      const apiUrl = '/api/members';
      
      // 调试日志
      console.log('会员列表请求参数:', {
        queryParams: Object.fromEntries(queryParams.entries()),
        typeFilter,
        apiUrl
      });
      
      console.log('请求URL:', `${apiUrl}?${queryParams}`);

      // 添加时间戳参数，确保绕过缓存获取最新数据
      queryParams.set('_t', Date.now().toString());
      
      const response = await fetch(`${apiUrl}?${queryParams}`, {
        credentials: 'include',  // 确保发送cookie
        cache: 'no-store',       // 禁用缓存
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      console.log('响应状态码:', response.status);
      
      // 尝试解析响应体
      let data;
      try {
        data = await response.json();
        console.log('响应数据类型:', typeof data);
        console.log('响应数据结构:', Object.keys(data));
      } catch (parseError) {
        console.error('解析响应JSON失败:', parseError);
        throw new Error('解析服务器响应失败');
      }

      // 添加响应数据调试日志
      console.log('会员列表响应详情:', {
        status: response.status,
        success: response.ok,
        error: data.error,
        details: data.details,
        totalRecords: data.total,
        records: data.data?.length,
        recordSample: data.data && data.data.length > 0 ? data.data[0] : '无数据'
      });

      if (!response.ok) {
        throw new Error(data.error || '获取会员列表失败');
      }

      console.log('成功获取会员数据，记录数:', data.data?.length);
      setMembers(data.data || []);
      setTotal(data.total || 0);
      setTotalCount(data.total || 0);
      setMemberCounts(data.memberCounts || { total: data.total || 0 });
      console.log('===== 会员列表获取完成 =====');
    } catch (error) {
      console.error('获取会员列表失败:', error);
      toast({
        variant: 'destructive',
        title: '获取会员列表失败',
        description: error instanceof Error ? error.message : '未知错误'
      });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, typeFilter, genderFilter, searchTerm, toast, filterInitialized]);

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/login');
      return;
    }

    if (filterInitialized) {
      fetchMembers();
    }
  }, [isLoading, session, router, fetchMembers, filterInitialized]);

  useEffect(() => {
    console.log('筛选条件变化:', {
      statusFilter,
      typeFilter,
      genderFilter,
      searchTerm
    });
    fetchMembers();
  }, [statusFilter, typeFilter, genderFilter, searchTerm, fetchMembers]);

  useEffect(() => {
    const newFilters = {
      status: statusFilter,
      type: typeFilter,
      gender: genderFilter,
      search: searchTerm
    };
    updateFilters(newFilters);
  }, [statusFilter, typeFilter, genderFilter, searchTerm, updateFilters]);

  // 会员类型相关函数
  const getMemberTypeText = (type: string, remainingMatches: number): string => {
    switch (type) {
      case 'NORMAL':
        return '普通会员';
      case 'ONE_TIME':
        return `一次性会员 (${remainingMatches}次)`;
      case 'ANNUAL':
        return '年费会员';
      default:
        return '未知';
    }
  };

  const getGenderText = (gender: string): string => {
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
    if (!marriageHistory) return '未填写';
    
    switch (marriageHistory) {
      case 'YES':
        return '有婚史';
      case 'NO':
        return '无婚史';
      case 'HAS_HISTORY':
        return '有婚史';
      case 'NO_HISTORY':
        return '无婚史';
      default:
        return marriageHistory; // 直接显示原始值，保持向后兼容
    }
  };

  const getEducationText = (education: string) => {
    if (!education) return '未填写';
    
    switch (education) {
      case 'PRIMARY_SCHOOL':
        return '小学';
      case 'MIDDLE_SCHOOL':
        return '初中';
      case 'HIGH_SCHOOL':
        return '高中';
      case 'JUNIOR_COLLEGE':
        return '专科';
      case 'COLLEGE':
        return '大专';
      case 'BACHELOR':
        return '本科';
      case 'MASTER':
        return '硕士';
      case 'DOCTOR':
        return '博士';
      case 'PHD':
        return '博士';
      default:
        return education; // 直接显示原始值，保持向后兼容
    }
  };

  const getSexualOrientationText = (sexualOrientation: string) => {
    if (!sexualOrientation) return '未填写';
    
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
      case 'STRAIGHT':
        return '异性恋';
      case 'HOMOSEXUAL':
        return '同性恋';
      case 'BISEXUAL':
        return '双性恋';
      default:
        return sexualOrientation; // 直接显示原始值，保持向后兼容
    }
  };

  // 处理目标区域显示
  const getTargetAreaText = (targetArea: string) => {
    if (!targetArea) return '未填写';
    return targetArea;
  };

  // 处理个人说明显示
  const getSelfDescriptionText = (selfDescription: string) => {
    if (!selfDescription) return '未填写';
    // 限制显示长度，超过50个字符时截断并显示省略号
    if (selfDescription.length > 50) {
      return selfDescription.substring(0, 50) + '...';
    }
    return selfDescription;
  };

  // 处理择偶要求显示
  const getPartnerRequirementText = (partnerRequirement: string) => {
    if (!partnerRequirement) return '未填写';
    // 限制显示长度，超过50个字符时截断并显示省略号
    if (partnerRequirement.length > 50) {
      return partnerRequirement.substring(0, 50) + '...';
    }
    return partnerRequirement;
  };

  const handlePageChange = (page: number) => {
    // 更新URL
    const url = new URL(window.location.href);
    url.searchParams.set('page', page.toString());
    window.history.pushState({}, '', url.toString());
    
    setCurrentPage(page);
    setPage(page);
  };

  const getColumnWidth = (columnKey: ColumnKey): string => {
    switch (columnKey) {
      case 'member_no':
        return 'w-[120px]';
      case 'actions':
        return 'w-[320px]';
      case 'wechat':
        return 'min-w-[150px]';
      case 'phone':
        return 'min-w-[120px]';
      case 'wechat_qrcode':
        return 'min-w-[100px]';
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

  // 处理图片点击事件
  const handleImageClick = (imageUrl: string) => {
    setPreviewImageUrl(imageUrl);
    setImagePreviewOpen(true);
  };

  // 会员操作处理函数
  const handleMatch = async (memberId: string) => {
    if (!targetMemberNo.trim()) {
      toast({
        variant: 'destructive',
        title: '匹配失败',
        description: '请输入目标会员编号'
      });
      return;
    }

    setMatchLoading(true);
    try {
      const response = await fetch('/api/members/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId,
          targetMemberNo,
          matchedBy: session?.user?.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '会员匹配失败');
      }

      toast({
        title: '会员匹配成功',
        description: '已成功匹配会员'
      });

      setMatchDialogOpen(false);
      setTargetMemberNo('');
      fetchMembers();
    } catch (error) {
      console.error('会员匹配失败:', error);
      toast({
        variant: 'destructive',
        title: '会员匹配失败',
        description: error instanceof Error ? error.message : (error as { message?: string })?.message || '操作失败，请重试'
      });
    } finally {
      setMatchLoading(false);
    }
  };

  const handleActivate = async (memberId: string) => {
    if (!activateReason.trim()) {
      toast({
        variant: 'destructive',
        title: '激活失败',
        description: '请输入激活原因'
      });
      return;
    }

    setActivateLoading(true);
    try {
      const response = await fetch(`/api/members/${memberId}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session?.user?.id || '',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({
          reason: activateReason,
          notes: ''
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '会员激活失败');
      }

      toast({
        title: '会员激活成功',
        description: '已将会员状态更新为激活'
      });

      // 先关闭对话框和清理状态
      setActivateDialogOpen(false);
      setActivateReason('');
      
      // 刷新路由缓存
      router.refresh();
      
      // 延迟一点时间后重新获取数据，确保后端更新生效
      setTimeout(() => {
        fetchMembers();
      }, 300);
    } catch (error) {
      console.error('会员激活失败:', error);
      toast({
        variant: 'destructive',
        title: '会员激活失败',
        description: error instanceof Error ? error.message : '操作失败，请重试'
      });
    } finally {
      setActivateLoading(false);
    }
  };

  const handleRevoke = async (memberId: string) => {
    if (!revokeReason.trim()) {
      toast({
        variant: 'destructive',
        title: '撤销失败',
        description: '请输入撤销原因'
      });
      return;
    }

    setRevokeLoading(true);
    try {
      const response = await fetch(`/api/members/${memberId}/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session?.user?.id || '',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({ reason: revokeReason })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '会员撤销失败');
      }

      toast({
        title: '会员撤销成功',
        description: '已将会员状态更新为撤销'
      });

      // 先关闭对话框和清理状态
      setRevokeDialogOpen(false);
      setRevokeReason('');
      
      // 刷新路由缓存
      router.refresh();
      
      // 延迟一点时间后重新获取数据
      setTimeout(() => {
        fetchMembers();
      }, 300);
    } catch (error) {
      console.error('会员撤销失败:', error);
      toast({
        variant: 'destructive',
        title: '会员撤销失败',
        description: error instanceof Error ? error.message : '操作失败，请重试'
      });
    } finally {
      setRevokeLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!selectedMemberId || !upgradeType) {
      toast({
        variant: 'destructive',
        title: '升级失败',
        description: '请选择会员和升级类型'
      });
      return;
    }

    // 验证日期
    if (!upgradeDate || isNaN(upgradeDate.getTime())) {
      toast({
        variant: 'destructive',
        title: '升级失败',
        description: '请选择有效的升级日期'
      });
      return;
    }
    
    setUpgradeLoading(true);
    try {
      const paymentTime = upgradeDate.toISOString().slice(0, 19).replace('T', ' ');
      const expiryTime = upgradeType === 'ANNUAL' 
        ? new Date(upgradeDate.getFullYear() + 1, upgradeDate.getMonth(), upgradeDate.getDate() - 1).toISOString().slice(0, 19).replace('T', ' ')
        : null;
      
      // 在控制台打印详细信息，帮助调试
      console.log('开始会员升级:', { 
        memberId: selectedMemberId, 
        upgradeType, 
        paymentTime, 
        expiryTime,
        userId: session?.user?.id
      });
      
      const response = await fetch(`/api/members/${selectedMemberId}/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session?.user?.id || '',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({
          type: upgradeType,
          payment_time: paymentTime,
          expiry_time: expiryTime,
          notes: `${new Date().toLocaleString('zh-CN')} 将会员升级为${upgradeType === 'ONE_TIME' ? '一次性会员' : upgradeType === 'ANNUAL' ? '年费会员' : '普通会员'}`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '会员升级失败');
      }

      const result = await response.json();
      
      toast({
        title: '会员升级成功',
        description: result.message || `已将会员升级为${upgradeType === 'ONE_TIME' ? '一次性会员' : upgradeType === 'ANNUAL' ? '年费会员' : '普通会员'}`
      });

      // 关闭对话框并重置状态
      setUpgradeDialogOpen(false);
      setSelectedMemberId(null);
      setSelectedMemberType(null);
      setUpgradeDate(new Date());
      
      // 刷新路由缓存
      router.refresh();
      
      // 延迟一点时间后重新获取数据，确保后端更新生效
      setTimeout(() => {
        fetchMembers();
      }, 300);
    } catch (error) {
      console.error('会员升级失败:', error);
      toast({
        variant: 'destructive',
        title: '会员升级失败',
        description: error instanceof Error ? error.message : '操作失败，请重试'
      });
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleDelete = async (memberId: string) => {
    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/members/${memberId}/delete`, {
        method: 'DELETE',
        headers: {
          'x-user-id': session?.user?.id || '',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '删除失败');
      }

      toast({
        title: '删除成功',
        description: '会员数据已删除'
      });

      // 先关闭对话框和清理状态
      setDeleteDialogOpen(false);
      setSelectedMemberId(null);
      
      // 刷新路由缓存
      router.refresh();
      
      // 延迟一点时间后重新获取数据，确保后端更新生效
      setTimeout(() => {
        fetchMembers();
      }, 300);
    } catch (error) {
      console.error('删除会员失败:', error);
      toast({
        variant: 'destructive',
        title: '删除失败',
        description: error instanceof Error ? error.message : '操作失败，请重试'
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      // 构建查询参数
      const queryParams = new URLSearchParams();
      
      if (statusFilter) queryParams.set('status', statusFilter);
      if (genderFilter) queryParams.set('gender', genderFilter);
      if (typeFilter) queryParams.set('type', typeFilter);
      if (searchTerm) queryParams.set('search', searchTerm);

      // 请求下载文件
      const exportUrl = `/api/members/export?${queryParams}`;
      
      // 使用窗口打开下载链接
      window.open(exportUrl, '_blank');
      
      toast({
        title: '导出处理中',
        description: '正在准备下载文件，请稍候...'
      });

    } catch (error) {
      console.error('导出失败:', error);
      toast({
        variant: 'destructive',
        title: '导出失败',
        description: error instanceof Error ? error.message : '未知错误'
      });
    }
  };
  
  // 列选择处理函数
  const handleColumnChange = (columns: ColumnKey[]) => {
    // 确保操作列始终在最后
    const columnsWithoutActions = columns.filter(col => col !== 'actions');
    const finalColumns = [...columnsWithoutActions, 'actions'];
    setSelectedColumns(finalColumns);
    localStorage.setItem('memberTableColumns', JSON.stringify(finalColumns));
  };

  // 移动端黑色toast工具函数
  const showMobileToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    // 检测是否为移动端
    const isMobile = window.innerWidth < 1024; // lg断点
    
    if (isMobile) {
      // 创建黑色toast元素
      const toastElement = document.createElement('div');
      toastElement.className = `fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] px-4 py-2 rounded-md text-white text-sm font-medium shadow-lg transition-all duration-300 ${
        type === 'success' ? 'bg-black' : 'bg-red-600'
      }`;
      toastElement.textContent = message;
      toastElement.style.opacity = '0';
      toastElement.style.transform = 'translate(-50%, -20px)';
      
      document.body.appendChild(toastElement);
      
      // 动画显示
      requestAnimationFrame(() => {
        toastElement.style.opacity = '1';
        toastElement.style.transform = 'translate(-50%, 0)';
      });
      
      // 2秒后移除
      setTimeout(() => {
        toastElement.style.opacity = '0';
        toastElement.style.transform = 'translate(-50%, -20px)';
        setTimeout(() => {
          if (document.body.contains(toastElement)) {
            document.body.removeChild(toastElement);
          }
        }, 300);
      }, 2000);
      
      return true; // 表示已显示移动端toast
    }
    
    return false; // 表示未显示移动端toast，需要使用默认toast
  }, []);

  // 会员信息复制功能
  const copyMemberInfo = useCallback(async (member: Member) => {
    try {
      // 首先获取完整的会员详情，以确保获得所有字段（包括个人说明和择偶要求）
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
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(info.join('\n'));
        setCopiedMemberId(member.id);
        setTimeout(() => setCopiedMemberId(null), 2000);
        
        // 移动端显示黑色toast，PC端显示默认toast
        if (!showMobileToast('会员信息已复制')) {
          toast({
            title: "复制成功",
            description: "会员基本信息已复制到剪贴板"
          });
        }
      } else {
        // 浏览器不支持clipboard API的备用方案
        const textArea = document.createElement('textarea');
        textArea.value = info.join('\n');
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          const successful = document.execCommand('copy');
          if (successful) {
            setCopiedMemberId(member.id);
            setTimeout(() => setCopiedMemberId(null), 2000);
            
            // 移动端显示黑色toast，PC端显示默认toast
            if (!showMobileToast('会员信息已复制')) {
              toast({
                title: "复制成功",
                description: "会员基本信息已复制到剪贴板"
              });
            }
          } else {
            throw new Error('复制失败');
          }
        } catch (err) {
          console.error('复制失败:', err);
          
          // 移动端显示黑色错误toast，PC端显示默认错误toast
          if (!showMobileToast('复制失败', 'error')) {
            toast({
              variant: 'destructive',
              title: "复制失败",
              description: "无法复制到剪贴板"
            });
          }
        }
        
        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.error('复制会员信息失败:', error);
      
      // 移动端显示黑色错误toast，PC端显示默认错误toast
      if (!showMobileToast('复制失败', 'error')) {
        toast({
          variant: 'destructive',
          title: "复制失败",
          description: error instanceof Error ? error.message : "未知错误"
        });
      }
    }
  }, [getChildrenPlanText, getEducationText, getHouseCarText, getMarriageCertText, getMarriageHistoryText, getSexualOrientationText, toast, showMobileToast]);

  // 会员链接复制功能
  const copyMemberLink = useCallback(async (member: Member) => {
    try {
      // 构建会员H5链接
      const memberLink = `https://m.xinghun.info/user/${member.id}`;
      
      // 复制到剪贴板
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(memberLink);
        setCopiedLinkMemberId(member.id);
        setTimeout(() => setCopiedLinkMemberId(null), 2000);
        
        // 移动端显示黑色toast，PC端显示默认toast
        if (!showMobileToast('会员链接已复制')) {
          toast({
            title: "复制成功",
            description: "会员链接已复制到剪贴板"
          });
        }
      } else {
        // 浏览器不支持clipboard API的备用方案
        const textArea = document.createElement('textarea');
        textArea.value = memberLink;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          const successful = document.execCommand('copy');
          if (successful) {
            setCopiedLinkMemberId(member.id);
            setTimeout(() => setCopiedLinkMemberId(null), 2000);
            
            // 移动端显示黑色toast，PC端显示默认toast
            if (!showMobileToast('会员链接已复制')) {
              toast({
                title: "复制成功",
                description: "会员链接已复制到剪贴板"
              });
            }
          } else {
            throw new Error('复制失败');
          }
        } catch (err) {
          console.error('复制失败:', err);
          
          // 移动端显示黑色错误toast，PC端显示默认错误toast
          if (!showMobileToast('复制失败', 'error')) {
            toast({
              variant: 'destructive',
              title: "复制失败",
              description: "无法复制到剪贴板"
            });
          }
        }
        
        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.error('复制会员链接失败:', error);
      
      // 移动端显示黑色错误toast，PC端显示默认错误toast
      if (!showMobileToast('复制失败', 'error')) {
        toast({
          variant: 'destructive',
          title: "复制失败",
          description: error instanceof Error ? error.message : "未知错误"
        });
      }
    }
  }, [toast, showMobileToast]);

  // 生成二维码名片
  const generateQRCodeCard = useCallback(async (member: Member) => {
    setQrCodeGenerating(true);
    
    try {
      toast({
        title: "生成中",
        description: "正在生成二维码名片..."
      });

      // 构建会员链接
      const memberLink = `https://m.xinghun.info/user/${member.id}`;
      
      // 生成二维码数据URL
      const qrCodeDataUrl = await QRCode.toDataURL(memberLink, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // 创建canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('无法创建Canvas上下文');
      }

      // 设置高分辨率canvas (提高清晰度)
      const scale = 3; // 提高分辨率倍数
      
      // 加载底图先获取实际尺寸
      const backgroundImg = new Image();
      backgroundImg.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        backgroundImg.onload = resolve;
        backgroundImg.onerror = reject;
        backgroundImg.src = '/qcord.png';
      });

      // 根据底图实际尺寸设置Canvas，保持原始比例
      const imgWidth = backgroundImg.naturalWidth;
      const imgHeight = backgroundImg.naturalHeight;
      
      canvas.width = imgWidth * scale;
      canvas.height = imgHeight * scale;
      
      // 设置CSS显示尺寸
      canvas.style.width = `${imgWidth}px`;
      canvas.style.height = `${imgHeight}px`;
      
      // 缩放上下文以匹配高分辨率
      ctx.scale(scale, scale);

      // 绘制底图 (使用实际尺寸，不压缩变形)
      ctx.drawImage(backgroundImg, 0, 0, imgWidth, imgHeight);

      // 加载二维码图片
      const qrCodeImg = new Image();
      await new Promise((resolve, reject) => {
        qrCodeImg.onload = resolve;
        qrCodeImg.onerror = reject;
        qrCodeImg.src = qrCodeDataUrl;
      });

      // 绘制二维码 (调整位置往上移，进一步增大尺寸)
      const qrSize = Math.min(imgWidth * 0.45, 300); // 进一步增大到图片宽度的45%，最大300px
      const qrX = (imgWidth - qrSize) / 2;
      const qrY = imgHeight * 0.6; // 从图片高度的60%位置开始，往上移动了
      ctx.drawImage(qrCodeImg, qrX, qrY, qrSize, qrSize);

      // 设置文字样式 - 根据提供的CSS样式
      ctx.fillStyle = '#8400B9'; // 紫色
      ctx.textAlign = 'center';
      ctx.font = `bold ${Math.max(24, imgWidth * 0.04)}px "Source Han Sans", "PingFang SC", "Microsoft YaHei", sans-serif`;

      // 计算标题位置 (往上调整)
      const titleCenterX = imgWidth / 2; // 居中显示
      const titleY = imgHeight * 0.45; // 从图片高度的45%位置，比之前更靠上

      // 组合所有信息到一行显示
      const infoText = `${member.member_no} ${member.city} ${member.gender === 'male' ? '男' : '女'} 找形婚`;
      ctx.fillText(infoText, titleCenterX, titleY);

      // 生成预览图片
      const dataUrl = canvas.toDataURL('image/png');
      setQrCodePreviewUrl(dataUrl);
      
      toast({
        title: "生成成功",
        description: "二维码名片已生成，可以预览和下载"
      });

    } catch (error) {
      console.error('生成二维码名片失败:', error);
      toast({
        variant: 'destructive',
        title: "生成失败",
        description: error instanceof Error ? error.message : "未知错误"
      });
    } finally {
      setQrCodeGenerating(false);
    }
  }, [toast]);

  // 下载二维码图片
  const downloadQRCodeImage = useCallback(() => {
    if (!qrCodePreviewUrl || !selectedQrCodeMember) return;

    const link = document.createElement('a');
    link.download = `${selectedQrCodeMember.member_no}_二维码名片.png`;
    link.href = qrCodePreviewUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "下载成功",
      description: "二维码名片已保存到本地"
    });
  }, [qrCodePreviewUrl, selectedQrCodeMember, toast]);

  // 处理二维码按钮点击
  const handleQRCodeClick = useCallback((member: Member) => {
    setSelectedQrCodeMember(member);
    setQrCodeDialogOpen(true);
    setQrCodePreviewUrl(null);
    generateQRCodeCard(member);
  }, [generateQRCodeCard]);

  // 关闭二维码对话框
  const handleQRCodeDialogClose = useCallback(() => {
    setQrCodeDialogOpen(false);
    setQrCodePreviewUrl(null);
    setSelectedQrCodeMember(null);
  }, []);

  // 修改清空筛选函数，同时清除 localStorage
  const clearFilters = () => {
    setStatusFilter(null);
    setTypeFilter(null);
    setGenderFilter(null);
    setSearchTerm('');
    setSearchKeyword('');
    
    // 清除保存的筛选项
    localStorage.removeItem('memberListFilters');
    
    toast({
      title: "筛选已重置",
      description: "所有筛选条件已清空"
    });
  };

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center p-4">加载中...</div>;
  }

  return (
    <div className="space-y-4">
      {/* 二维码生成对话框 */}
      <Dialog open={qrCodeDialogOpen} onOpenChange={handleQRCodeDialogClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>二维码名片预览</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {qrCodeGenerating ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">正在生成二维码名片...</p>
                </div>
              </div>
            ) : qrCodePreviewUrl ? (
              <div className="space-y-4">
                <div className="border rounded-lg overflow-hidden">
                  <img 
                    src={qrCodePreviewUrl} 
                    alt="二维码名片预览" 
                    className="w-full h-auto"
                  />
                </div>
                
                <div className="flex justify-center">
                  <Button onClick={downloadQRCodeImage} className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    下载图片
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <p className="text-sm text-muted-foreground">准备生成二维码名片...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 图片预览对话框 */}
      <Dialog open={imagePreviewOpen} onOpenChange={setImagePreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>微信二维码</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            {previewImageUrl && (
              <img 
                src={previewImageUrl} 
                alt="微信二维码预览" 
                className="max-w-full max-h-[500px] object-contain rounded-lg border"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '';
                  target.alt = '图片加载失败';
                  target.className = 'text-gray-400 p-8';
                }}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImagePreviewOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 激活会员对话框 */}
      <Dialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>激活会员</DialogTitle>
            <DialogDescription>
              请输入激活原因
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">激活原因</label>
              <Input
                value={activateReason}
                onChange={(e) => setActivateReason(e.target.value)}
                placeholder="请输入激活原因"
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivateDialogOpen(false)}>取消</Button>
            <Button onClick={() => handleActivate(selectedMemberId!)} disabled={activateLoading}>
              {activateLoading ? '激活中...' : '确认激活'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 撤销会员对话框 */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent className="w-[95%] max-w-lg mx-auto">
          <DialogHeader>
            <DialogTitle>撤销会员</DialogTitle>
            <DialogDescription>
              请输入撤销原因
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">撤销原因</label>
              <Input
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="请输入撤销原因"
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeDialogOpen(false)}>取消</Button>
            <Button onClick={() => handleRevoke(selectedMemberId!)} disabled={revokeLoading}>
              {revokeLoading ? '撤销中...' : '确认撤销'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 会员升级对话框 */}
      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>会员升级</DialogTitle>
            <DialogDescription>
              请选择要升级的会员类型
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">升级类型</label>
              <Select value={upgradeType} onValueChange={(value: any) => setUpgradeType(value)} disabled={selectedMemberType === 'ONE_TIME'}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择升级类型" />
                </SelectTrigger>
                <SelectContent>
                  {selectedMemberType === 'NORMAL' && <SelectItem value="ONE_TIME">一次性会员</SelectItem>}
                  {selectedMemberType !== 'ANNUAL' && <SelectItem value="ANNUAL">年费会员</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">升级时间</label>
              <Input
                type="date"
                value={upgradeDate.toISOString().split('T')[0]}
                onChange={(e) => {
                  try {
                    const inputValue = e.target.value;
                    if (inputValue) {
                      // 验证日期格式
                      const selectedDate = new Date(inputValue);
                      if (!isNaN(selectedDate.getTime())) {
                        setUpgradeDate(selectedDate);
                      } else {
                        // 如果日期无效，不更新状态，保持原有值
                        console.warn('无效的日期格式:', inputValue);
                        toast({
                          variant: 'destructive',
                          title: '日期格式错误',
                          description: '请选择有效的日期'
                        });
                      }
                    }
                  } catch (error) {
                    console.error('日期处理错误:', error);
                    toast({
                      variant: 'destructive',
                      title: '日期处理失败',
                      description: '请重新选择日期'
                    });
                  }
                }}
                className="w-full"
                min={new Date().toISOString().split('T')[0]} // 设置最小日期为今天
                max={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} // 最大日期为一年后
              />
              <p className="text-xs text-gray-500">请选择升级日期，默认为今天</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeDialogOpen(false)}>取消</Button>
            <Button onClick={handleUpgrade} disabled={upgradeLoading}>
              {upgradeLoading ? '升级中...' : '确认升级'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 会员匹配对话框 */}
      <Dialog open={matchDialogOpen} onOpenChange={setMatchDialogOpen}>
        <DialogContent className="w-[95%] max-w-2xl mx-auto">
          <DialogHeader>
            <DialogTitle>匹配会员</DialogTitle>
            <DialogDescription>
              <div className="flex items-center space-x-4 mb-4 mt-[50px] bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-center space-x-8">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-blue-600">{memberCounts.NORMAL || 0}</div>
                    <div className="text-sm text-gray-600">普通会员</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600">{memberCounts.ONE_TIME || 0}</div>
                    <div className="text-sm text-gray-600">一次性会员</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-purple-600">{memberCounts.ANNUAL || 0}</div>
                    <div className="text-sm text-gray-600">年费会员</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium">目标会员编号</label>
                <Input
                  value={targetMemberNo}
                  onChange={(e) => setTargetMemberNo(e.target.value)}
                  placeholder="请输入目标会员编号"
                  className="w-full"
                />
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">目标会员编号</label>
              <Input
                value={targetMemberNo}
                onChange={(e) => setTargetMemberNo(e.target.value)}
                placeholder="请输入目标会员编号"
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMatchDialogOpen(false)}>取消</Button>
            <Button onClick={() => handleMatch(selectedMemberId!)} disabled={matchLoading}>
              {matchLoading ? '匹配中...' : '确认匹配'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除会员对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="w-[95%] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>删除会员</DialogTitle>
            <DialogDescription>
              确定要删除这个会员吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button
              variant="destructive"
              onClick={() => handleDelete(selectedMemberId!)}
              disabled={deleteLoading}
            >
              {deleteLoading ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 主页面内容 */}
      <div className="flex-1 flex flex-col">
        {/* 搜索和过滤 - 优化移动端布局 */}
        <div className="flex flex-col gap-3 mb-4">
          {/* 关键词搜索框 */}
          <div className="flex gap-2">
            <Input
              placeholder="搜索会员编号/微信/手机"
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setSearchTerm(searchKeyword);
                }
              }}
              className="flex-1"
            />
            <Button onClick={() => setSearchTerm(searchKeyword)} className="px-4">
              搜索
            </Button>
          </div>
          
          {/* 筛选下拉框 - 移动端垂直排列，桌面端水平排列 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 md:flex gap-2">
            <Select 
              value={statusFilter !== null ? statusFilter : 'ALL'} 
              onValueChange={(value) => {
                if (value === 'ALL') {
                  setStatusFilter(null);
                } else {
                  setStatusFilter(value);
                }
              }}
              defaultValue={statusFilter !== null ? statusFilter : 'ALL'}
            >
              <SelectTrigger className="w-full md:w-[120px]">
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部状态</SelectItem>
                <SelectItem value="ACTIVE">激活</SelectItem>
                <SelectItem value="REVOKED">撤销</SelectItem>
                <SelectItem value="SUCCESS">成功</SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={typeFilter !== null ? typeFilter : 'ALL'} 
              onValueChange={(value) => {
                if (value === 'ALL') {
                  setTypeFilter(null);
                } else {
                  setTypeFilter(value);
                }
              }}
              defaultValue={typeFilter !== null ? typeFilter : 'ALL'}
            >
              <SelectTrigger className="w-full md:w-[120px]">
                <SelectValue placeholder="会员类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部类型</SelectItem>
                <SelectItem value="NORMAL">普通会员</SelectItem>
                <SelectItem value="ONE_TIME">一次性会员</SelectItem>
                <SelectItem value="ANNUAL">年费会员</SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={genderFilter !== null ? genderFilter : 'ALL'} 
              onValueChange={(value) => {
                if (value === 'ALL') {
                  setGenderFilter(null);
                } else {
                  setGenderFilter(value);
                }
              }}
              defaultValue={genderFilter !== null ? genderFilter : 'ALL'}
            >
              <SelectTrigger className="w-full md:w-[120px]">
                <SelectValue placeholder="性别筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部性别</SelectItem>
                <SelectItem value="male">男</SelectItem>
                <SelectItem value="female">女</SelectItem>
              </SelectContent>
            </Select>
            
            {/* 清除筛选按钮 */}
            <Button 
              variant="outline" 
              onClick={clearFilters}
              className="w-full md:w-auto"
            >
              清除筛选
            </Button>
          </div>
          
          {/* 操作按钮组 - 移动端垂直排列，桌面端水平排列 */}
          <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Link href="/members/new" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto">
                新增会员
              </Button>
            </Link>
            
            <Button 
              variant="outline"
              onClick={handleExport}
              className="flex items-center justify-center gap-1 w-full sm:w-auto"
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
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span className="hidden sm:inline">导出会员</span>
              <span className="sm:hidden">导出</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setIsColumnSelectorOpen(!isColumnSelectorOpen)}
              className="relative w-full sm:w-auto"
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
                className="mr-2"
              >
                <path d="M3 3h18v18H3zM12 3v18M3 12h18" />
              </svg>
              <span className="hidden sm:inline">显示字段</span>
              <span className="sm:hidden">字段</span>
            </Button>
            
            {isColumnSelectorOpen && (
              <div className="absolute right-4 top-[120px] bg-white border rounded-md shadow-lg p-4 z-[1002] w-[280px]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="font-medium text-sm">选择显示字段</h3>
                    <span className="text-sm text-gray-500">
                      已选 {selectedColumns.length} 项
                    </span>
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {availableColumns.map(({ key, label }) => (
                      <label key={key} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={selectedColumns.includes(key as ColumnKey)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleColumnChange([...selectedColumns, key as ColumnKey]);
                            } else {
                              handleColumnChange(selectedColumns.filter(col => col !== key));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="rounded-md border">
            {/* 使用相对定位容器和溢出滚动 */}
            <div className="relative overflow-x-auto" style={{ maxWidth: '100%' }}>
              <table className="w-full text-sm">
                <thead className="bg-white sticky top-0 z-20">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium bg-white">会员编号</th>
                    <th className="px-4 py-3 text-left font-medium bg-white">微信号</th>
                    <th className="px-4 py-3 text-left font-medium bg-white">手机号</th>
                    <th className="px-4 py-3 text-left font-medium bg-white">会员类型</th>
                    <th className="px-4 py-3 text-left font-medium bg-white">状态</th>
                    {/* 操作列固定在右侧 */}
                    <th className="px-4 py-3 text-left font-medium sticky right-0 bg-white shadow-[-4px_0_5px_-2px_rgba(0,0,0,0.1)] z-10 min-w-[280px]">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 10 }).map((_, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-3"><Skeleton className="h-4 w-[100px]" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-[120px]" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-[120px]" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-[100px]" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-[80px]" /></td>
                      {/* 操作列固定在右侧 */}
                      <td className="px-4 py-3 sticky right-0 bg-white shadow-[-4px_0_5px_-2px_rgba(0,0,0,0.1)] z-10">
                        <div className="flex gap-1 items-center">
                          <Skeleton className="h-7 w-[36px]" />
                          <div className="h-4 border-r border-gray-300"></div>
                          <Skeleton className="h-7 w-[36px]" />
                          <div className="h-4 border-r border-gray-300"></div>
                          <Skeleton className="h-7 w-[36px]" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : members.length === 0 ? (
          <div className="rounded-md border">
            <div className="px-4 py-8 text-center text-muted-foreground">暂无会员数据</div>
          </div>
        ) : (
          <>
            {/* 移动端卡片布局 */}
            <div className="lg:hidden space-y-4 mb-[60px]">
              {members.map((member) => (
                <div key={member.id} className="bg-white rounded-lg border p-4 shadow-sm">
                  {/* 卡片头部 */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-base">{member.member_no}</span>
                        <span 
                          className={`px-2 py-1 rounded-full text-xs ${
                            member.type === 'ANNUAL' 
                              ? 'bg-blue-100 text-blue-800' 
                              : member.type === 'ONE_TIME'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {getMemberTypeText(member.type, member.remaining_matches)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{member.wechat}</span>
                        <span>{member.phone}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      member.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-800' 
                        : member.status === 'REVOKED' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {member.status === 'ACTIVE' ? '激活' : member.status === 'REVOKED' ? '撤销' : '成功'}
                    </span>
                  </div>

                  {/* 卡片内容 */}
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <span className="text-gray-500">性别：</span>
                      <span>{getGenderText(member.gender)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">出生年份：</span>
                      <span>{member.birth_year}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">身高：</span>
                      <span>{member.height}cm</span>
                    </div>
                    <div>
                      <span className="text-gray-500">学历：</span>
                      <span>{getEducationText(member.education)}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">地区：</span>
                      <span>{member.province} {member.city} {member.district}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">创建时间：</span>
                      <span>{new Date(member.created_at).toLocaleString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
                    </div>
                  </div>

                  {/* 卡片操作按钮 */}
                  <div className="flex flex-wrap gap-2 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={() => router.push(`/members/${member.id}`)}
                    >
                      查看
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={() => router.push(`/members/${member.id}/edit`)}
                    >
                      编辑
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={() => copyMemberInfo(member)}
                    >
                      {copiedMemberId === member.id ? '已复制' : '复制'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={() => handleQRCodeClick(member)}
                    >
                      二维码
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={() => copyMemberLink(member)}
                    >
                      {copiedLinkMemberId === member.id ? '已复制链接' : '复制链接'}
                    </Button>
                    {member.status === 'ACTIVE' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs text-blue-600 hidden"
                          onClick={() => {
                            if (member.remaining_matches <= 0) {
                              toast({
                                variant: 'destructive',
                                title: '匹配失败',
                                description: '该用户匹配次数为0，无法匹配'
                              });
                              return;
                            }
                            setSelectedMemberId(member.id);
                            setMatchDialogOpen(true);
                          }}
                          disabled={loading || member.status !== 'ACTIVE'}
                        >
                          匹配
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs text-red-600"
                          onClick={() => {
                            setSelectedMemberId(member.id);
                            setRevokeReason('');
                            setRevokeDialogOpen(true);
                          }}
                        >
                          撤销
                        </Button>
                      </>
                    )}
                    {member.status === 'REVOKED' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs text-blue-600"
                          onClick={() => {
                            setSelectedMemberId(member.id);
                            setActivateDialogOpen(true);
                          }}
                        >
                          激活
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs text-red-600"
                          onClick={() => {
                            setSelectedMemberId(member.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          删除
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 桌面端表格布局 */}
            <div className="hidden lg:block">
              {/* 添加滚动提示 */}
              <div className="flex items-center text-sm text-muted-foreground mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M18 8L22 12L18 16"></path>
                  <path d="M6 8L2 12L6 16"></path>
                </svg>
                <span>左右滑动可查看更多列，操作按钮已固定在最右侧</span>
              </div>

              <div className="rounded-md border overflow-hidden mb-[60px]">
                {/* 使用相对定位容器和溢出滚动 */}
                <div className="relative overflow-x-auto" style={{ maxWidth: '100%' }}>
                  <table className="w-full text-sm">
                  <thead className="bg-white sticky top-0 z-20">
                    <tr>
                      {selectedColumns.filter(col => col !== 'actions').map((columnKey: ColumnKey) => {
                        const column = availableColumns.find(col => col.key === columnKey);
                        if (!column) return null;
                        return (
                          <th key={column.key} className={`px-4 py-3 text-left font-medium whitespace-nowrap bg-white ${getColumnWidth(column.key)}`}>
                            {column.label}
                          </th>
                        );
                      })}
                      {/* 操作列固定在右侧 */}
                      {selectedColumns.includes('actions') && (
                        <th className="px-4 py-3 text-left font-medium whitespace-nowrap sticky right-0 bg-white shadow-[-4px_0_5px_-2px_rgba(0,0,0,0.1)] z-10 min-w-[280px]">
                          操作
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id} className="border-t hover:bg-muted/30">
                        {selectedColumns.filter(col => col !== 'actions').map((columnKey: ColumnKey) => (
                          <td key={columnKey} className={`px-4 py-2 whitespace-nowrap ${getColumnWidth(columnKey)}`}>
                            {columnKey === 'type' ? (
                              <span 
                                className={`px-2 py-1 rounded-full text-xs ${
                                  member.type === 'ANNUAL' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : member.type === 'ONE_TIME'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-gray-100 text-gray-800'
                                } ${member.status === 'ACTIVE' && member.type !== 'ANNUAL' ? 'cursor-pointer hover:bg-opacity-80' : ''}`}
                                onClick={() => {
                                  // 只有当会员状态为激活且不是年费会员时才能升级
                                  if (member.status === 'ACTIVE' && member.type !== 'ANNUAL') {
                                    setSelectedMemberId(member.id);
                                    setSelectedMemberType(member.type);
                                    // 设置默认升级类型
                                    setUpgradeType(member.type === 'NORMAL' ? 'ONE_TIME' : 'ANNUAL');
                                    setUpgradeDate(new Date());
                                    setUpgradeDialogOpen(true);
                                  }
                                }}
                              >
                                {getMemberTypeText(member.type, member.remaining_matches)}
                              </span>
                            ) :
                            columnKey === 'wechat_qrcode' ? (
                              member.wechat_qrcode ? (
                                <div className="flex items-center justify-center">
                                  <img 
                                    src={member.wechat_qrcode.startsWith('data:') ? member.wechat_qrcode : `data:image/png;base64,${member.wechat_qrcode}`} 
                                    alt="微信二维码" 
                                    className="w-8 h-8 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => handleImageClick(member.wechat_qrcode.startsWith('data:') ? member.wechat_qrcode : `data:image/png;base64,${member.wechat_qrcode}`)}
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      target.parentElement!.innerHTML = '<span class="text-gray-400 text-xs">无图</span>';
                                    }}
                                  />
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">无二维码</span>
                              )
                            ) :
                            columnKey === 'gender' ? getGenderText(member.gender) :
                            columnKey === 'house_car' ? getHouseCarText(member.house_car) :
                            columnKey === 'children_plan' ? getChildrenPlanText(member.children_plan) :
                            columnKey === 'marriage_cert' ? getMarriageCertText(member.marriage_cert) :
                            columnKey === 'marriage_history' ? getMarriageHistoryText(member.marriage_history) :
                            columnKey === 'sexual_orientation' ? getSexualOrientationText(member.sexual_orientation) :
                            columnKey === 'education' ? getEducationText(member.education) :
                            columnKey === 'target_area' ? getTargetAreaText(member.target_area) :
                            columnKey === 'self_description' ? getSelfDescriptionText(member.self_description) :
                            columnKey === 'partner_requirement' ? getPartnerRequirementText(member.partner_requirement) :
                            columnKey === 'status' ? (
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                member.status === 'ACTIVE' 
                                  ? 'bg-green-100 text-green-800' 
                                  : member.status === 'REVOKED' 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {member.status === 'ACTIVE' ? '激活' : member.status === 'REVOKED' ? '撤销' : '成功'}
                              </span>
                            ) :
                            columnKey === 'created_at' ? new Date(member[columnKey]).toLocaleString('zh-CN', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) :
                            String(member[columnKey as keyof Member])}
                          </td>
                        ))}
                        {/* 操作列固定在右侧 */}
                        {selectedColumns.includes('actions') && (
                          <td className="px-4 py-2 whitespace-nowrap sticky right-0 bg-white hover:bg-gray-50 shadow-[-4px_0_5px_-2px_rgba(0,0,0,0.1)] z-10 min-w-[280px] backdrop-blur-sm">
                            <div className="flex gap-1 items-center flex-nowrap">
                              <Button
                                variant="outline"
                                size="xs"
                                className="h-7 px-2 py-0 text-xs border border-gray-300 hover:bg-gray-50 shadow-sm"
                                onClick={() => router.push(`/members/${member.id}`)}
                              >
                                查看
                              </Button>
                              <div className="h-4 border-r border-gray-300"></div>
                              <Button
                                variant="outline"
                                size="xs"
                                className="h-7 px-2 py-0 text-xs border border-gray-300 hover:bg-gray-50 shadow-sm"
                                onClick={() => router.push(`/members/${member.id}/edit`)}
                              >
                                编辑
                              </Button>
                              <div className="h-4 border-r border-gray-300"></div>
                              <Button
                                variant="outline"
                                size="xs"
                                className="h-7 px-2 py-0 text-xs border border-gray-300 hover:bg-gray-50 shadow-sm"
                                onClick={() => copyMemberInfo(member)}
                              >
                                {copiedMemberId === member.id ? (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    已复制
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <Copy className="w-3 h-3" />
                                    复制
                                  </span>
                                )}
                              </Button>
                              <div className="h-4 border-r border-gray-300"></div>
                              <Button
                                variant="outline"
                                size="xs"
                                className="h-7 px-2 py-0 text-xs border border-gray-300 hover:bg-gray-50 shadow-sm"
                                onClick={() => handleQRCodeClick(member)}
                              >
                                <QrCode className="w-3 h-3 mr-1" />
                                二维码
                              </Button>
                              <div className="h-4 border-r border-gray-300"></div>
                              <Button
                                variant="outline"
                                size="xs"
                                className="h-7 px-2 py-0 text-xs border border-gray-300 hover:bg-gray-50 shadow-sm"
                                onClick={() => copyMemberLink(member)}
                              >
                                {copiedLinkMemberId === member.id ? (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    已复制链接
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <Copy className="w-3 h-3" />
                                    复制链接
                                  </span>
                                )}
                              </Button>
                              {member.status === 'ACTIVE' && (
                                <>
                                  <div className="h-4 border-r border-gray-300 hidden"></div>
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    className="h-7 px-2 py-0 text-xs border border-gray-300 text-blue-500 hover:bg-blue-50 shadow-sm hidden"
                                    onClick={() => {
                                      if (member.remaining_matches <= 0) {
                                        toast({
                                          variant: 'destructive',
                                          title: '匹配失败',
                                          description: '该用户匹配次数为0，无法匹配'
                                        });
                                        return;
                                      }
                                      setSelectedMemberId(member.id);
                                      setMatchDialogOpen(true);
                                    }}
                                    disabled={loading || member.status !== 'ACTIVE'}
                                  >
                                    匹配
                                  </Button>
                                  <div className="h-4 border-r border-gray-300"></div>
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    className="h-7 px-2 py-0 text-xs border border-gray-300 text-red-500 hover:bg-red-50 shadow-sm"
                                    onClick={() => {
                                      setSelectedMemberId(member.id);
                                      setRevokeReason('');
                                      setRevokeDialogOpen(true);
                                    }}
                                  >
                                    撤销
                                  </Button>
                                </>
                              )}
                              {member.status === 'REVOKED' && (
                                <>
                                  <div className="h-4 border-r border-gray-300"></div>
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    className="h-7 px-2 py-0 text-xs border border-gray-300 text-blue-500 hover:bg-blue-50 shadow-sm"
                                    onClick={() => {
                                      setSelectedMemberId(member.id);
                                      setActivateDialogOpen(true);
                                    }}
                                  >
                                    激活
                                  </Button>
                                  <div className="h-4 border-r border-gray-300"></div>
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    className="h-7 px-2 py-0 text-xs border border-gray-300 text-red-500 hover:bg-red-50 shadow-sm"
                                    onClick={() => {
                                      setSelectedMemberId(member.id);
                                      setDeleteDialogOpen(true);
                                    }}
                                  >
                                    删除
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 分页 */}
            <div className="h-[48px] flex items-center justify-between border-t fixed bottom-0 left-0 md:left-[57px] right-0 bg-white z-50 px-3 md:px-6 shadow-sm">
              <div className="text-xs md:text-sm text-muted-foreground flex items-center">
                <span className="mr-1 md:mr-2">共 {totalCount} 条</span>
                <select 
                  className="ml-1 md:ml-2 px-1 md:px-2 py-1 border border-gray-300 rounded text-xs md:text-sm"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  <option value="10">10条/页</option>
                  <option value="25">25条/页</option>
                  <option value="50">50条/页</option>
                  <option value="100">100条/页</option>
                </select>
              </div>
              <div className="flex gap-1 md:gap-2 items-center">
                <div className="hidden sm:flex items-center text-xs md:text-sm mr-2 md:mr-4">
                  <span className="mr-1 md:mr-2">跳至</span>
                  <input 
                    type="number" 
                    min="1" 
                    max={totalPages} 
                    value={currentPage}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (value >= 1 && value <= totalPages) {
                        handlePageChange(value);
                      }
                    }}
                    className="w-[40px] md:w-[50px] px-1 md:px-2 py-1 border border-gray-300 rounded text-center text-xs md:text-sm"
                  />
                  <span className="ml-1 md:ml-2">页</span>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="h-7 md:h-8 min-w-[30px] md:min-w-[40px] px-1 md:px-2"
                >
                  <span className="sr-only">首页</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="11 17 6 12 11 7"></polyline>
                    <polyline points="18 17 13 12 18 7"></polyline>
                  </svg>
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-7 md:h-8 min-w-[30px] md:min-w-[40px] px-1 md:px-2"
                >
                  <span className="sr-only">上一页</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </Button>
                
                <span className="px-2 md:px-4 text-xs md:text-sm">
                  {currentPage} / {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-7 md:h-8 min-w-[30px] md:min-w-[40px] px-1 md:px-2"
                >
                  <span className="sr-only">下一页</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="h-7 md:h-8 min-w-[30px] md:min-w-[40px] px-1 md:px-2"
                >
                  <span className="sr-only">尾页</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="13 17 18 12 13 7"></polyline>
                    <polyline points="6 17 11 12 6 7"></polyline>
                  </svg>
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function MembersPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    }>
      <MembersPageContent />
    </Suspense>
  );
} 