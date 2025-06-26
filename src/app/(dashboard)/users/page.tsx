'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from 'react';
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Settings, Plus } from 'lucide-react';

// 定义用户接口，对应数据库users表结构
interface User {
  id: number;
  phone: string;
  status: 'not-logged-in' | 'need-setup' | 'active';
  username: string | null;
  nickname: string | null;
  password: string | null;
  avatar: string | null;
  notification_enabled: number;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  registered: number;
  refresh_count: number;
  member_type: '普通会员' | '一次性会员' | '年费会员';
  member_id?: string | null; // 关联的会员ID
  [key: string]: string | number | null | undefined;
}

// 添加自定义Session类型
interface SessionUser {
  id: number;
  email?: string;
  name?: string;
  role?: string;
}

interface Session {
  user?: SessionUser;
}

// 定义可用的列
type ColumnKey = 'phone' | 'username' | 'nickname' | 'status' | 'created_at' | 'last_login_at' | 'registered' | 'member_type' | 'refresh_count' | 'actions';

// 可用列定义
const availableColumns: { key: ColumnKey; label: string }[] = [
  { key: 'phone', label: '手机号' },
  { key: 'username', label: '用户名' },
  { key: 'nickname', label: '昵称' },
  { key: 'status', label: '状态' },
  { key: 'registered', label: '资料完善' },
  { key: 'created_at', label: '创建时间' },
  { key: 'last_login_at', label: '最后登录' },
  { key: 'member_type', label: '会员类型' },
  { key: 'refresh_count', label: '刷新次数' },
  { key: 'actions', label: '操作' }
];

// 列选择器组件
function ColumnSelector({ 
  visibleColumns, 
  setVisibleColumns 
}: { 
  visibleColumns: ColumnKey[]; 
  setVisibleColumns: (columns: ColumnKey[]) => void 
}) {
  // 本地状态，用于跟踪选中的列
  const [selectedColumns, setSelectedColumns] = useState<ColumnKey[]>(visibleColumns);
  
  // 处理列选择变更
  const handleColumnChange = (column: ColumnKey, checked: boolean) => {
    if (checked) {
      // 添加列
      setSelectedColumns(prev => [...prev, column]);
    } else {
      // 移除列，但确保至少保留一列
      if (selectedColumns.length > 1) {
        setSelectedColumns(prev => prev.filter(col => col !== column));
      }
    }
  };
  
  // 应用选择
  const applySelection = () => {
    // 确保 'actions' 列始终可见
    if (!selectedColumns.includes('actions')) {
      setSelectedColumns(prev => [...prev, 'actions']);
    }
    setVisibleColumns(selectedColumns);
    
    // 保存到本地存储
    localStorage.setItem('userTableVisibleColumns', JSON.stringify(selectedColumns));
  };
  
  // 重置为默认设置
  const resetToDefault = () => {
    const defaultColumns: ColumnKey[] = ['phone', 'username', 'nickname', 'status', 'registered', 'member_type', 'created_at', 'refresh_count', 'actions'];
    setSelectedColumns(defaultColumns);
    setVisibleColumns(defaultColumns);
    localStorage.setItem('userTableVisibleColumns', JSON.stringify(defaultColumns));
  };
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="ml-2">
          <Settings className="h-4 w-4 mr-2" />
          显示字段
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="space-y-4">
          <h4 className="font-medium">选择要显示的列</h4>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {availableColumns.map(column => (
              <div key={column.key} className="flex items-center space-x-2">
                <Checkbox 
                  id={`column-${column.key}`} 
                  checked={selectedColumns.includes(column.key)}
                  onCheckedChange={(checked: boolean | 'indeterminate') => 
                    handleColumnChange(column.key, checked === true)
                  }
                  disabled={column.key === 'actions'} // 操作列始终可见
                />
                <Label 
                  htmlFor={`column-${column.key}`}
                  className={column.key === 'actions' ? 'opacity-70' : ''}
                >
                  {column.label}
                  {column.key === 'actions' && ' (必选)'}
                </Label>
              </div>
            ))}
          </div>
          <div className="flex justify-between pt-2">
            <Button variant="outline" size="sm" onClick={resetToDefault}>
              恢复默认
            </Button>
            <Button size="sm" onClick={applySelection}>
              应用
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function UsersPageContent() {
  const { toast } = useToast();
  const { session, isLoading } = useAuth() as { session: Session | null, isLoading: boolean };
  const router = useRouter();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [memberType, setMemberType] = useState('all');
  const [status, setStatus] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>([
    'phone', 'username', 'nickname', 'status', 'registered', 'member_type', 'created_at', 'refresh_count', 'actions'
  ]);
  
  // 分页相关状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // 增加刷新次数对话框状态
  const [refreshDialogOpen, setRefreshDialogOpen] = useState(false);
  const [refreshCount, setRefreshCount] = useState<number>(1);
  const [refreshUserId, setRefreshUserId] = useState<number | null>(null);
  const [refreshUserName, setRefreshUserName] = useState<string>('');

  // 获取用户数据 - 将函数定义移到useEffect之前，以解决ReferenceError问题
  const fetchUsers = useCallback(async (page = 1, size = 25) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: size.toString()
      });
      
      const response = await fetch(`/api/users?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('获取用户列表失败');
      }
      
      const data = await response.json();
      setUsers(data.users || []);
      setTotalCount(data.total || data.users?.length || 0);
      setTotalPages(Math.ceil((data.total || data.users?.length || 0) / size));
      setLoading(false);
    } catch (error) {
      console.error('获取用户列表失败:', error);
      toast({
        title: '错误',
        description: '获取用户列表失败',
        variant: 'destructive',
      });
      setLoading(false);
    }
  }, [toast, pageSize]);

  // 从本地存储加载列配置
  useEffect(() => {
    const savedColumns = localStorage.getItem('userTableVisibleColumns');
    if (savedColumns) {
      try {
        const parsed = JSON.parse(savedColumns) as ColumnKey[];
        // 确保操作列始终可见
        if (!parsed.includes('actions')) {
          parsed.push('actions');
        }
        setVisibleColumns(parsed);
      } catch (e) {
        console.error('解析存储的列配置失败:', e);
      }
    }
  }, []);

  // 首次加载时获取数据
  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/login');
      return;
    }

    // 从URL获取页码参数
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');
    const initialPage = pageParam ? parseInt(pageParam, 10) : 1;
    
    setCurrentPage(initialPage);
    fetchUsers(initialPage, pageSize);
  }, [isLoading, session, router, fetchUsers, pageSize]);

  // 处理搜索
  const handleSearch = () => {
    fetchUsers();
  };

  // 处理用户删除
  const handleDelete = async (userId: number) => {
    setSelectedUserId(userId);
    setDeleteDialogOpen(true);
  };

  // 打开增加刷新次数对话框
  const openRefreshDialog = (userId: number, userName: string) => {
    setRefreshUserId(userId);
    setRefreshUserName(userName || '该用户');
    setRefreshCount(1);
    setRefreshDialogOpen(true);
  };

  // 提交增加刷新次数
  const submitRefreshCount = async () => {
    if (!refreshUserId) return;
    
    try {
      setLoading(true);
      
      // 获取当前用户信息
      const response = await fetch(`/api/users/${refreshUserId}`);
      if (!response.ok) {
        throw new Error('获取用户信息失败');
      }
      
      const userData = await response.json();
      if (!userData.success || !userData.user) {
        throw new Error('获取用户信息失败');
      }
      
      // 计算新的刷新次数
      const currentCount = userData.user.refresh_count || 0;
      const newCount = currentCount + refreshCount;
      
      // 更新用户刷新次数
      const updateResponse = await fetch(`/api/users/${refreshUserId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_count: newCount
        }),
      });
      
      if (!updateResponse.ok) {
        throw new Error('更新刷新次数失败');
      }
      
      // 更新本地状态
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === refreshUserId 
            ? { ...user, refresh_count: newCount } 
            : user
        )
      );
      
      toast({
        title: "更新成功",
        description: `已为${refreshUserName}增加${refreshCount}次刷新次数`
      });
      
      // 关闭对话框
      setRefreshDialogOpen(false);
    } catch (error) {
      console.error('增加刷新次数失败:', error);
      toast({
        variant: "destructive",
        title: "更新失败",
        description: error instanceof Error ? error.message : "增加刷新次数失败，请重试"
      });
    } finally {
      setLoading(false);
    }
  };

  // 确认删除
  const confirmDelete = async () => {
    if (!selectedUserId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${selectedUserId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('删除用户失败');
      }
      
      // 更新本地状态
      setUsers(prevUsers => prevUsers.filter(user => user.id !== selectedUserId));
      
      toast({
        title: "删除成功",
        description: "用户已成功删除"
      });
    } catch (error) {
      console.error('删除用户失败:', error);
      toast({
        variant: "destructive",
        title: "删除失败",
        description: "删除用户失败，请重试"
      });
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setSelectedUserId(null);
    }
  };

  // 获取状态文本
  const getStatusText = (status: string): string => {
    const statusMap: Record<string, string> = {
      'not-logged-in': '未登录',
      'need-setup': '待设置',
      'active': '正常'
    };
    return statusMap[status] || status;
  };

  // 获取资料完善状态文本
  const getRegisteredText = (registered: number): string => {
    return registered === 1 ? '已完善' : '未完善';
  };

  // 根据筛选条件构建显示的用户列表
  const filteredUsers = users.filter(user => {
    // 搜索条件过滤
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      !searchQuery || 
      (user.phone && user.phone.toLowerCase().includes(searchLower)) || 
      (user.username && user.username.toLowerCase().includes(searchLower)) || 
      (user.nickname && user.nickname.toLowerCase().includes(searchLower));
    
    // 会员类型过滤
    const matchesMemberType = 
      memberType === 'all' || 
      user.member_type === memberType;
    
    // 状态过滤
    const matchesStatus = 
      status === 'all' || 
      user.status === status;
    
    return matchesSearch && matchesMemberType && matchesStatus;
  });

  // 处理页码变更
  const handlePageChange = (page: number) => {
    // 更新URL
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('page', page.toString());
      window.history.pushState({}, '', url.toString());
    }
    
    setCurrentPage(page);
    fetchUsers(page, pageSize);
  };

  return (
    <div className="space-y-4">
      {/* 搜索和过滤 */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex gap-2 w-full md:w-auto">
          <Input
            placeholder="搜索手机号/用户名/昵称"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 md:w-[300px]"
          />
          <Button 
            onClick={handleSearch}
            className="shrink-0 px-4 md:px-6"
          >
            搜索
          </Button>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <Select value={memberType} onValueChange={setMemberType}>
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue placeholder="会员类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有类型</SelectItem>
              <SelectItem value="普通会员">普通会员</SelectItem>
              <SelectItem value="一次性会员">一次性会员</SelectItem>
              <SelectItem value="年费会员">年费会员</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有状态</SelectItem>
              <SelectItem value="active">正常</SelectItem>
              <SelectItem value="need-setup">待设置</SelectItem>
              <SelectItem value="not-logged-in">未登录</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex-1" />
        
        <div className="flex items-center">
          <Button onClick={() => router.push('/users/new')}>
            新增用户
          </Button>
          <ColumnSelector 
            visibleColumns={visibleColumns} 
            setVisibleColumns={setVisibleColumns} 
          />
        </div>
      </div>
      
      {/* 用户列表 */}
      {loading ? (
        <div className="rounded-md border">
          <div className="px-4 py-8 text-center text-muted-foreground">加载中...</div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-md border">
          <div className="px-4 py-8 text-center text-muted-foreground">暂无用户数据</div>
        </div>
      ) : (
        <>
          {/* 移动端卡片布局 */}
          <div className="lg:hidden space-y-4 mb-[60px]">
            {filteredUsers.map((user) => (
              <div key={user.id} className="bg-white rounded-lg border p-4 shadow-sm">
                {/* 卡片头部 */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-base">{user.phone}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        user.member_type === '年费会员' 
                          ? 'bg-blue-100 text-blue-800' 
                          : user.member_type === '一次性会员'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.member_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{user.username || '未设置'}</span>
                      <span>{user.nickname || '未设置'}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    user.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : user.status === 'need-setup'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {getStatusText(user.status as string)}
                  </span>
                </div>

                {/* 卡片内容 */}
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <span className="text-gray-500">资料完善：</span>
                    <span>{getRegisteredText(user.registered)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">刷新次数：</span>
                    <span>{user.refresh_count}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">创建时间：</span>
                    <span>{new Date(user.created_at).toLocaleString('zh-CN', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>
                  {user.last_login_at && (
                    <div className="col-span-2">
                      <span className="text-gray-500">最后登录：</span>
                      <span>{new Date(user.last_login_at).toLocaleString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
                    </div>
                  )}
                </div>

                {/* 卡片操作按钮 */}
                <div className="flex flex-wrap gap-2 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs"
                    onClick={() => router.push(`/users/${user.id}/edit`)}
                  >
                    编辑
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs text-green-600"
                    onClick={() => openRefreshDialog(
                      user.id as number,
                      user.username || user.nickname || user.phone
                    )}
                  >
                    增加刷新次数
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs text-red-600"
                    onClick={() => handleDelete(user.id as number)}
                  >
                    删除
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* 桌面端表格布局 */}
          <div className="hidden lg:block">
            <div className="rounded-md border overflow-hidden mb-[80px]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {visibleColumns.includes('phone') && <th className="px-4 py-3 text-left font-medium">手机号</th>}
                {visibleColumns.includes('username') && <th className="px-4 py-3 text-left font-medium">用户名</th>}
                {visibleColumns.includes('nickname') && <th className="px-4 py-3 text-left font-medium">昵称</th>}
                {visibleColumns.includes('status') && <th className="px-4 py-3 text-left font-medium">状态</th>}
                {visibleColumns.includes('created_at') && <th className="px-4 py-3 text-left font-medium">创建时间</th>}
                {visibleColumns.includes('last_login_at') && <th className="px-4 py-3 text-left font-medium">最后登录</th>}
                {visibleColumns.includes('registered') && <th className="px-4 py-3 text-left font-medium">资料完善</th>}
                {visibleColumns.includes('member_type') && <th className="px-4 py-3 text-left font-medium">会员类型</th>}
                {visibleColumns.includes('refresh_count') && <th className="px-4 py-3 text-left font-medium">刷新次数</th>}
                {visibleColumns.includes('actions') && <th className="px-4 py-3 text-left font-medium">操作</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                // 加载状态
                Array(3).fill(0).map((_, index) => (
                  <tr key={index} className="border-t">
                    {visibleColumns.includes('phone') && (
                      <td className="px-4 py-2">
                        <Skeleton className="h-4 w-[150px]" />
                      </td>
                    )}
                    {visibleColumns.includes('username') && (
                      <td className="px-4 py-2">
                        <Skeleton className="h-4 w-[150px]" />
                      </td>
                    )}
                    {visibleColumns.includes('nickname') && (
                      <td className="px-4 py-2">
                        <Skeleton className="h-4 w-[100px]" />
                      </td>
                    )}
                    {visibleColumns.includes('status') && (
                      <td className="px-4 py-2">
                        <Skeleton className="h-4 w-[80px]" />
                      </td>
                    )}
                    {visibleColumns.includes('created_at') && (
                      <td className="px-4 py-2">
                        <Skeleton className="h-4 w-[120px]" />
                      </td>
                    )}
                    {visibleColumns.includes('last_login_at') && (
                      <td className="px-4 py-2">
                        <Skeleton className="h-4 w-[120px]" />
                      </td>
                    )}
                    {visibleColumns.includes('registered') && (
                      <td className="px-4 py-2">
                        <Skeleton className="h-4 w-[80px]" />
                      </td>
                    )}
                    {visibleColumns.includes('member_type') && (
                      <td className="px-4 py-2">
                        <Skeleton className="h-4 w-[100px]" />
                      </td>
                    )}
                    {visibleColumns.includes('refresh_count') && (
                      <td className="px-4 py-2">
                        <Skeleton className="h-4 w-[80px]" />
                      </td>
                    )}
                    {visibleColumns.includes('actions') && (
                      <td className="px-4 py-2">
                        <Skeleton className="h-4 w-[100px]" />
                      </td>
                    )}
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                // 无数据状态
                <tr className="border-t">
                  <td 
                    colSpan={visibleColumns.length} 
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    没有找到匹配的用户
                  </td>
                </tr>
              ) : (
                // 数据列表
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-t hover:bg-muted/30">
                    {visibleColumns.includes('phone') && (
                      <td className="px-4 py-2">{user.phone}</td>
                    )}
                    {visibleColumns.includes('username') && (
                      <td className="px-4 py-2">{user.username || '-'}</td>
                    )}
                    {visibleColumns.includes('nickname') && (
                      <td className="px-4 py-2">{user.nickname || '-'}</td>
                    )}
                    {visibleColumns.includes('status') && (
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          user.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : user.status === 'need-setup'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {getStatusText(user.status as string)}
                        </span>
                      </td>
                    )}
                    {visibleColumns.includes('created_at') && (
                      <td className="px-4 py-2">{new Date(user.created_at).toLocaleString('zh-CN', { 
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</td>
                    )}
                    {visibleColumns.includes('last_login_at') && (
                      <td className="px-4 py-2">{user.last_login_at ? new Date(user.last_login_at).toLocaleString('zh-CN', { 
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : '-'}</td>
                    )}
                    {visibleColumns.includes('registered') && (
                      <td className="px-4 py-2">
                        {user.registered === 1 && user.member_id ? (
                          <Link href={`/members/${user.member_id}`}>
                            <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 cursor-pointer hover:bg-green-200">
                              已完善
                            </span>
                          </Link>
                        ) : (
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.registered === 1
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {getRegisteredText(user.registered as number)}
                          </span>
                        )}
                      </td>
                    )}
                    {visibleColumns.includes('member_type') && (
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          user.member_type === '年费会员'
                            ? 'bg-blue-100 text-blue-800'
                            : user.member_type === '一次性会员'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.member_type}
                        </span>
                      </td>
                    )}
                    {visibleColumns.includes('refresh_count') && (
                      <td className="px-4 py-2">{user.refresh_count}</td>
                    )}
                    {visibleColumns.includes('actions') && (
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => router.push(`/users/${user.id}/edit`)}
                          >
                            编辑
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openRefreshDialog(
                              user.id as number,
                              user.username || user.nickname || user.phone
                            )}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            增加刷新次数
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDelete(user.id as number)}
                          >
                            删除
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      
      {/* 分页 */}
      <div className="h-[48px] flex items-center justify-between border-t fixed bottom-0 left-0 md:left-[57px] right-0 bg-white z-50 px-3 md:px-6 shadow-sm">
        <div className="text-xs md:text-sm text-muted-foreground flex items-center">
          <span className="mr-1 md:mr-2">共 {totalCount} 条</span>
          <select 
            className="ml-1 md:ml-2 px-1 md:px-2 py-1 border border-gray-300 rounded text-xs md:text-sm"
            value={pageSize}
            onChange={(e) => {
              const newSize = Number(e.target.value);
              setPageSize(newSize);
              fetchUsers(1, newSize);
              setCurrentPage(1);
            }}
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
      
      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              您确定要删除此用户吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
            >
              取消
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 增加刷新次数对话框 */}
      <Dialog open={refreshDialogOpen} onOpenChange={setRefreshDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>增加刷新次数</DialogTitle>
            <DialogDescription>
              为 {refreshUserName} 增加刷新次数。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center space-x-4">
              <Label htmlFor="refresh-count" className="flex-shrink-0">增加次数：</Label>
              <Input
                id="refresh-count"
                type="number"
                value={refreshCount}
                onChange={(e) => setRefreshCount(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                className="flex-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setRefreshDialogOpen(false)}
            >
              取消
            </Button>
            <Button 
              onClick={submitRefreshCount}
              disabled={loading}
            >
              {loading ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <UsersPageContent />
    </Suspense>
  );
} 