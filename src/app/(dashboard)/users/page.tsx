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
import { Session } from '@supabase/auth-helpers-nextjs';
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from 'react';
import Image from 'next/image';

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
  [key: string]: string | number | null;
}

// 定义可用的列
type ColumnKey = 'phone' | 'username' | 'nickname' | 'status' | 'avatar' | 'created_at' | 'last_login_at' | 'registered' | 'member_type' | 'refresh_count' | 'actions';

// 可用列定义
const availableColumns: { key: ColumnKey; label: string }[] = [
  { key: 'phone', label: '手机号' },
  { key: 'username', label: '用户名' },
  { key: 'nickname', label: '昵称' },
  { key: 'status', label: '状态' },
  { key: 'avatar', label: '头像' },
  { key: 'created_at', label: '创建时间' },
  { key: 'last_login_at', label: '最后登录' },
  { key: 'registered', label: '资料完善' },
  { key: 'member_type', label: '会员类型' },
  { key: 'refresh_count', label: '刷新次数' },
  { key: 'actions', label: '操作' }
];

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
    'phone', 'username', 'nickname', 'status', 'member_type', 'created_at', 'refresh_count', 'actions'
  ]);

  // 获取用户数据
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      
      if (!response.ok) {
        throw new Error('获取用户列表失败');
      }
      
      const data = await response.json();
      setUsers(data.users || []);
      setLoading(false);
    } catch (error) {
      console.error('获取用户失败:', error);
      toast({
        variant: "destructive",
        title: "获取失败",
        description: "获取用户列表失败"
      });
      setLoading(false);
    }
  }, [toast]);

  // 首次加载时获取数据
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // 处理搜索
  const handleSearch = () => {
    fetchUsers();
  };

  // 处理用户删除
  const handleDelete = async (userId: number) => {
    setSelectedUserId(userId);
    setDeleteDialogOpen(true);
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

  // 过滤用户数据
  const filteredUsers = users.filter(user => {
    // 搜索条件
    const matchesSearch = searchQuery 
      ? (user.phone?.toLowerCase().includes(searchQuery.toLowerCase()) || 
         user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         user.nickname?.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
    
    // 会员类型过滤
    const matchesMemberType = memberType === 'all' || user.member_type === memberType;
    
    // 状态过滤
    const matchesStatus = status === 'all' || user.status === status;
    
    return matchesSearch && matchesMemberType && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* 搜索和过滤 */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex gap-2 w-full md:w-auto">
          <Input
            placeholder="搜索手机号/用户名/昵称"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-[300px]"
          />
          <Button onClick={handleSearch}>搜索</Button>
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
        
        <Button onClick={() => router.push('/users/new')}>
          新增用户
        </Button>
      </div>
      
      {/* 用户表格 */}
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {visibleColumns.includes('phone') && <th className="px-4 py-3 text-left font-medium">手机号</th>}
                {visibleColumns.includes('username') && <th className="px-4 py-3 text-left font-medium">用户名</th>}
                {visibleColumns.includes('nickname') && <th className="px-4 py-3 text-left font-medium">昵称</th>}
                {visibleColumns.includes('status') && <th className="px-4 py-3 text-left font-medium">状态</th>}
                {visibleColumns.includes('avatar') && <th className="px-4 py-3 text-left font-medium">头像</th>}
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
                    {visibleColumns.includes('avatar') && (
                      <td className="px-4 py-2">
                        <Skeleton className="h-8 w-8 rounded-full" />
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
                    {visibleColumns.includes('avatar') && (
                      <td className="px-4 py-2">
                        {user.avatar ? (
                          <div className="w-8 h-8 rounded-full overflow-hidden">
                            <img 
                              src={user.avatar} 
                              alt={user.username || '用户头像'} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-500 text-xs">无</span>
                          </div>
                        )}
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
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          user.registered === 1
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {getRegisteredText(user.registered as number)}
                        </span>
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