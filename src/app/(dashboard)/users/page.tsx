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
  department: string;
  phone: string;
  [key: string]: string | number;
}

// 定义可用的列
type ColumnKey = 'email' | 'username' | 'role' | 'status' | 'department' | 'phone' | 'created_at' | 'last_login' | 'actions';

// 可用列定义
const availableColumns: { key: ColumnKey; label: string }[] = [
  { key: 'email', label: '邮箱' },
  { key: 'username', label: '用户名' },
  { key: 'role', label: '角色' },
  { key: 'status', label: '状态' },
  { key: 'department', label: '部门' },
  { key: 'phone', label: '手机号' },
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
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<ColumnKey[]>(() => {
    if (typeof window !== 'undefined') {
      const savedColumns = localStorage.getItem('userTableColumns');
      if (savedColumns) {
        const parsedColumns = JSON.parse(savedColumns);
        // 确保操作列始终在最后
        const columnsWithoutActions = parsedColumns.filter((col: string) => col !== 'actions');
        return [...columnsWithoutActions, 'actions'];
      }
    }
    // 默认显示列
    return ['email', 'username', 'role', 'status', 'department', 'created_at', 'actions'];
  });

  const handleColumnChange = (columns: ColumnKey[]) => {
    // 确保操作列始终在最后
    const columnsWithoutActions = columns.filter(col => col !== 'actions');
    const finalColumns = [...columnsWithoutActions, 'actions'];
    setSelectedColumns(finalColumns);
    localStorage.setItem('userTableColumns', JSON.stringify(finalColumns));
  };

  // 模拟获取用户数据
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 模拟用户数据
      const mockUsers: User[] = [
        {
          id: '1',
          email: 'admin@example.com',
          username: '管理员',
          role: 'admin',
          status: 'active',
          department: '技术部',
          phone: '13800138000',
          created_at: '2024-01-01',
          last_login: '2024-06-01'
        },
        {
          id: '2',
          email: 'manager@example.com',
          username: '经理',
          role: 'manager',
          status: 'active',
          department: '市场部',
          phone: '13800138001',
          created_at: '2024-02-01',
          last_login: '2024-05-28'
        },
        {
          id: '3',
          email: 'staff@example.com',
          username: '工作人员',
          role: 'staff',
          status: 'active',
          department: '客服部',
          phone: '13800138002',
          created_at: '2024-03-01',
          last_login: '2024-05-30'
        },
        {
          id: '4',
          email: 'guest@example.com',
          username: '访客',
          role: 'guest',
          status: 'inactive',
          department: '销售部',
          phone: '13800138003',
          created_at: '2024-04-01',
          last_login: '2024-04-15'
        },
        {
          id: '5',
          email: 'viewer@example.com',
          username: '查看者',
          role: 'viewer',
          status: 'inactive',
          department: '财务部',
          phone: '13800138004',
          created_at: '2024-05-01',
          last_login: '2024-05-10'
        }
      ];
      
      // 应用筛选
      let filteredUsers = mockUsers;
      
      if (roleFilter) {
        filteredUsers = filteredUsers.filter(user => user.role === roleFilter);
      }
      
      if (statusFilter) {
        filteredUsers = filteredUsers.filter(user => user.status === statusFilter);
      }
      
      if (searchTerm) {
        const keyword = searchTerm.toLowerCase();
        filteredUsers = filteredUsers.filter(
          user => 
            user.email.toLowerCase().includes(keyword) || 
            user.username.toLowerCase().includes(keyword) ||
            user.phone.includes(keyword)
        );
      }
      
      setUsers(filteredUsers);
      setTotal(filteredUsers.length);
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
  }, [page, pageSize, roleFilter, statusFilter, searchTerm, toast]);

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/login');
      return;
    }

    fetchUsers();
  }, [isLoading, session, router, fetchUsers]);

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter, searchTerm, fetchUsers]);

  // 处理用户删除
  const handleDelete = async (userId: string) => {
    setSelectedUserId(userId);
    setDeleteDialogOpen(true);
  };

  // 确认删除
  const confirmDelete = async () => {
    if (!selectedUserId) return;
    
    setDeleteLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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
      setDeleteLoading(false);
    }
  };

  // 获取角色文本
  const getRoleText = (role: string): string => {
    const roleMap: Record<string, string> = {
      'admin': '管理员',
      'manager': '经理',
      'staff': '工作人员',
      'guest': '访客',
      'viewer': '查看者'
    };
    return roleMap[role] || role;
  };

  // 获取状态文本和样式
  const getStatusInfo = (status: string): { text: string; className: string } => {
    switch (status) {
      case 'active':
        return { 
          text: '正常', 
          className: 'bg-green-100 text-green-800' 
        };
      case 'inactive':
        return { 
          text: '禁用', 
          className: 'bg-red-100 text-red-800' 
        };
      case 'pending':
        return { 
          text: '待审核', 
          className: 'bg-yellow-100 text-yellow-800' 
        };
      default:
        return { 
          text: '未知', 
          className: 'bg-gray-100 text-gray-800' 
        };
    }
  };

  const getColumnWidth = (columnKey: ColumnKey): string => {
    switch (columnKey) {
      case 'email':
        return 'min-w-[200px]';
      case 'username':
        return 'min-w-[120px]';
      case 'role':
      case 'status':
        return 'min-w-[100px]';
      case 'department':
        return 'min-w-[120px]';
      case 'phone':
        return 'min-w-[120px]';
      case 'created_at':
      case 'last_login':
        return 'min-w-[150px]';
      case 'actions':
        return 'w-[150px]';
      default:
        return 'min-w-[120px]';
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setPage(page);
  };

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center p-4">加载中...</div>;
  }

  return (
    <div className="space-y-4">
      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除用户</DialogTitle>
            <DialogDescription>
              确定要删除这个用户吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center space-x-4 mb-4">
          <div className="relative column-selector">
            <Button
              variant="outline"
              className="flex items-center gap-2"
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
              <div className="column-selector absolute top-[40px] left-0 bg-white border rounded-md shadow-lg p-4 z-[1000] w-[280px]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="font-medium text-sm">选择显示字段</h3>
                    <span className="text-[12px] text-gray-500">
                      已选 {selectedColumns.length} 项
                    </span>
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {availableColumns.filter(col => col.key !== 'actions').map(({ key, label }) => (
                      <label key={key} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={selectedColumns.includes(key)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleColumnChange([...selectedColumns, key]);
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
          
          <Input
            placeholder="搜索邮箱/用户名/手机号"
            value={searchKeyword}
            onChange={(e) => {
              setSearchKeyword(e.target.value);
              setSearchTerm(e.target.value);
            }}
            className="w-[240px]"
          />
          
          <Select value={roleFilter || 'all'} onValueChange={(value) => setRoleFilter(value === 'all' ? null : value)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="角色" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有角色</SelectItem>
              <SelectItem value="admin">管理员</SelectItem>
              <SelectItem value="manager">经理</SelectItem>
              <SelectItem value="staff">工作人员</SelectItem>
              <SelectItem value="guest">访客</SelectItem>
              <SelectItem value="viewer">查看者</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={statusFilter || 'all'} onValueChange={(value) => setStatusFilter(value === 'all' ? null : value)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有状态</SelectItem>
              <SelectItem value="active">正常</SelectItem>
              <SelectItem value="inactive">禁用</SelectItem>
              <SelectItem value="pending">待审核</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            onClick={() => {
              setSearchKeyword('');
              setSearchTerm('');
              setRoleFilter(null);
              setStatusFilter(null);
            }}
          >
            重置
          </Button>
          
          <div className="flex-1"></div>
          
          <Link href="/users/new">
            <Button>新增用户</Button>
          </Link>
        </div>

        {loading ? (
          <div className="bg-white rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">邮箱</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">用户名</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">角色</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="border-b">
                      <td className="px-4 py-3"><Skeleton className="h-4 w-[180px]" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-[100px]" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-[80px]" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-[60px]" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-[120px]" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-white rounded-md border">暂无用户数据</div>
        ) : (
          <div className="bg-white rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {selectedColumns.map((columnKey) => {
                      const column = availableColumns.find(col => col.key === columnKey);
                      return column ? (
                        <th key={column.key} className={`px-4 py-3 text-left text-sm font-medium ${getColumnWidth(column.key)}`}>
                          {column.label}
                        </th>
                      ) : null;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-muted/30">
                      {selectedColumns.map((columnKey) => (
                        <td key={columnKey} className="px-4 py-3 text-sm">
                          {columnKey === 'role' ? (
                            getRoleText(user.role)
                          ) : columnKey === 'status' ? (
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusInfo(user.status).className}`}>
                              {getStatusInfo(user.status).text}
                            </span>
                          ) : columnKey === 'actions' ? (
                            <div className="flex items-center gap-2">
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
                                onClick={() => handleDelete(user.id)}
                              >
                                删除
                              </Button>
                            </div>
                          ) : (
                            user[columnKey]
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {total > pageSize && (
              <div className="py-4 px-4 border-t flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  共 {total} 条记录
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    上一页
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }).map((_, index) => (
                      <Button
                        key={index + 1}
                        variant={currentPage === index + 1 ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(index + 1)}
                        className="w-8 h-8 p-0"
                      >
                        {index + 1}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    }>
      <UsersPageContent />
    </Suspense>
  );
} 