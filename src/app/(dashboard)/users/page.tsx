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

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  status: string;
  created_at: string;
  last_login: string;
  [key: string]: string | number;
}

// 定义可用的列
type ColumnKey = 'email' | 'username' | 'role' | 'status' | 'created_at' | 'last_login' | 'actions';

// 可用列定义
const availableColumns: { key: ColumnKey; label: string }[] = [
  { key: 'email', label: '邮箱' },
  { key: 'username', label: '用户名' },
  { key: 'role', label: '角色' },
  { key: 'status', label: '状态' },
  { key: 'created_at', label: '创建时间' },
  { key: 'last_login', label: '最后登录' },
  { key: 'actions', label: '操作' }
];

function UsersPageContent() {
  const { toast } = useToast();
  const { session, isLoading } = useAuth() as { session: Session | null, isLoading: boolean };
  const router = useRouter();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>([
    'email', 'username', 'role', 'status', 'created_at', 'actions'
  ]);

  // 模拟获取用户数据
  const fetchUsers = useCallback(async () => {
    try {
      // 这里应该是从API获取数据，目前使用模拟数据
      const mockUsers: User[] = [
        {
          id: '1',
          email: 'admin@example.com',
          username: '管理员',
          role: 'admin',
          status: 'active',
          created_at: '2024-01-01',
          last_login: '2024-06-01'
        },
        {
          id: '2',
          email: 'staff@example.com',
          username: '工作人员',
          role: 'staff',
          status: 'active',
          created_at: '2024-02-01',
          last_login: '2024-05-28'
        },
        {
          id: '3',
          email: 'viewer@example.com',
          username: '查看者',
          role: 'viewer',
          status: 'inactive',
          created_at: '2024-03-01',
          last_login: '2024-04-15'
        }
      ];
      
      setUsers(mockUsers);
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
    setLoading(true);
    // 实际应用中这里应该调用API进行搜索
    setTimeout(() => {
      setLoading(false);
    }, 500);
  };

  // 处理用户删除
  const handleDelete = async (userId: string) => {
    setSelectedUserId(userId);
    setDeleteDialogOpen(true);
  };

  // 确认删除
  const confirmDelete = async () => {
    if (!selectedUserId) return;
    
    try {
      // 实际应用中这里应该调用API删除用户
      console.log(`删除用户 ID: ${selectedUserId}`);
      
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
      setDeleteDialogOpen(false);
      setSelectedUserId(null);
    }
  };

  // 获取角色文本
  const getRoleText = (role: string): string => {
    const roleMap: Record<string, string> = {
      'admin': '管理员',
      'staff': '工作人员',
      'viewer': '查看者'
    };
    return roleMap[role] || role;
  };

  // 获取状态文本
  const getStatusText = (status: string): string => {
    const statusMap: Record<string, string> = {
      'active': '正常',
      'inactive': '禁用'
    };
    return statusMap[status] || status;
  };

  // 过滤用户数据
  const filteredUsers = users.filter(user => {
    // 搜索条件
    const matchesSearch = searchQuery 
      ? user.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    
    // 角色过滤
    const matchesRole = role === 'all' || user.role === role;
    
    // 状态过滤
    const matchesStatus = status === 'all' || user.status === status;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* 搜索和过滤 */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex gap-2 w-full md:w-auto">
          <Input
            placeholder="搜索用户名或邮箱"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-[300px]"
          />
          <Button onClick={handleSearch}>搜索</Button>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue placeholder="角色" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有角色</SelectItem>
              <SelectItem value="admin">管理员</SelectItem>
              <SelectItem value="staff">工作人员</SelectItem>
              <SelectItem value="viewer">查看者</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有状态</SelectItem>
              <SelectItem value="active">正常</SelectItem>
              <SelectItem value="inactive">禁用</SelectItem>
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
                {visibleColumns.includes('email') && <th className="px-4 py-3 text-left font-medium">邮箱</th>}
                {visibleColumns.includes('username') && <th className="px-4 py-3 text-left font-medium">用户名</th>}
                {visibleColumns.includes('role') && <th className="px-4 py-3 text-left font-medium">角色</th>}
                {visibleColumns.includes('status') && <th className="px-4 py-3 text-left font-medium">状态</th>}
                {visibleColumns.includes('created_at') && <th className="px-4 py-3 text-left font-medium">创建时间</th>}
                {visibleColumns.includes('last_login') && <th className="px-4 py-3 text-left font-medium">最后登录</th>}
                {visibleColumns.includes('actions') && <th className="px-4 py-3 text-left font-medium">操作</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                // 加载状态
                Array(3).fill(0).map((_, index) => (
                  <tr key={index} className="border-t">
                    {visibleColumns.includes('email') && (
                      <td className="px-4 py-2">
                        <Skeleton className="h-4 w-[200px]" />
                      </td>
                    )}
                    {visibleColumns.includes('username') && (
                      <td className="px-4 py-2">
                        <Skeleton className="h-4 w-[150px]" />
                      </td>
                    )}
                    {visibleColumns.includes('role') && (
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
                    {visibleColumns.includes('last_login') && (
                      <td className="px-4 py-2">
                        <Skeleton className="h-4 w-[120px]" />
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
                    {visibleColumns.includes('email') && (
                      <td className="px-4 py-2">{user.email}</td>
                    )}
                    {visibleColumns.includes('username') && (
                      <td className="px-4 py-2">{user.username}</td>
                    )}
                    {visibleColumns.includes('role') && (
                      <td className="px-4 py-2">{getRoleText(user.role as string)}</td>
                    )}
                    {visibleColumns.includes('status') && (
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          user.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {getStatusText(user.status as string)}
                        </span>
                      </td>
                    )}
                    {visibleColumns.includes('created_at') && (
                      <td className="px-4 py-2">{user.created_at as string}</td>
                    )}
                    {visibleColumns.includes('last_login') && (
                      <td className="px-4 py-2">{user.last_login as string}</td>
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
                            onClick={() => handleDelete(user.id as string)}
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