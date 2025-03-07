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

// 用户接口定义，与数据库表匹配
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
  member_type: '普通用户' | '一次性用户' | '年费用户';
  [key: string]: any;
}

// 定义可用的列
type ColumnKey = 'id' | 'phone' | 'status' | 'username' | 'nickname' | 'avatar' | 
                 'notification_enabled' | 'created_at' | 'updated_at' | 'last_login_at' | 
                 'registered' | 'refresh_count' | 'member_type' | 'actions';

// 可用列定义
const availableColumns: { key: ColumnKey; label: string }[] = [
  { key: 'id', label: 'ID' },
  { key: 'phone', label: '手机号' },
  { key: 'nickname', label: '昵称' },
  { key: 'username', label: '用户名' },
  { key: 'status', label: '状态' },
  { key: 'avatar', label: '头像' },
  { key: 'notification_enabled', label: '通知' },
  { key: 'created_at', label: '创建时间' },
  { key: 'updated_at', label: '更新时间' },
  { key: 'last_login_at', label: '最后登录' },
  { key: 'registered', label: '完善资料' },
  { key: 'refresh_count', label: '刷新次数' },
  { key: 'member_type', label: '用户类型' },
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
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [memberTypeFilter, setMemberTypeFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [memberTypeCounts, setMemberTypeCounts] = useState<Record<string, number>>({});
  const [selectedColumns, setSelectedColumns] = useState<ColumnKey[]>(() => {
    if (typeof window !== 'undefined') {
      const savedColumns = localStorage.getItem('userTableColumns');
      if (savedColumns) {
        try {
          const parsedColumns = JSON.parse(savedColumns);
          // 确保操作列始终在最后
          const columnsWithoutActions = parsedColumns.filter((col: string) => col !== 'actions');
          return [...columnsWithoutActions, 'actions'] as ColumnKey[];
        } catch (e) {
          // 如果解析失败，使用默认值
        }
      }
    }
    // 默认显示列
    return ['id', 'phone', 'nickname', 'username', 'status', 'member_type', 'created_at', 'actions'];
  });

  const handleColumnChange = (columns: ColumnKey[]) => {
    // 确保操作列始终在最后
    const columnsWithoutActions = columns.filter(col => col !== 'actions');
    const finalColumns = [...columnsWithoutActions, 'actions'] as ColumnKey[];
    setSelectedColumns(finalColumns);
    localStorage.setItem('userTableColumns', JSON.stringify(finalColumns));
  };

  // 获取用户数据
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      
      // 构建查询参数
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString()
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      if (statusFilter) {
        params.append('status', statusFilter);
      }
      
      if (memberTypeFilter) {
        params.append('memberType', memberTypeFilter);
      }
      
      // 调用API获取数据
      const response = await fetch(`/api/users?${params.toString()}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || '获取用户列表失败');
      }
      
      setUsers(result.data);
      setTotal(result.total);
      setStatusCounts(result.statusCounts || {});
      setMemberTypeCounts(result.memberTypeCounts || {});
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
  }, [page, pageSize, statusFilter, memberTypeFilter, searchTerm, toast]);

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/login');
      return;
    }

    fetchUsers();
  }, [isLoading, session, router, fetchUsers]);

  // 处理用户删除
  const handleDelete = async (userId: number) => {
    setSelectedUserId(userId);
    setDeleteDialogOpen(true);
  };

  // 确认删除
  const confirmDelete = async () => {
    if (!selectedUserId) return;
    
    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/users/${selectedUserId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || '删除用户失败');
      }
      
      toast({
        title: "删除成功",
        description: "用户已成功删除"
      });
      
      fetchUsers();
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

  // 获取状态文本和样式
  const getStatusInfo = (status: string): { text: string; className: string } => {
    switch (status) {
      case 'active':
        return { 
          text: '已激活', 
          className: 'bg-green-100 text-green-800' 
        };
      case 'not-logged-in':
        return { 
          text: '未登录', 
          className: 'bg-gray-100 text-gray-800' 
        };
      case 'need-setup':
        return { 
          text: '需设置', 
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
      case 'id':
        return 'w-[60px]';
      case 'phone':
        return 'min-w-[120px]';
      case 'nickname':
      case 'username':
        return 'min-w-[120px]';
      case 'status':
        return 'min-w-[100px]';
      case 'avatar':
        return 'w-[80px]';
      case 'notification_enabled':
        return 'w-[80px]';
      case 'registered':
        return 'w-[100px]';
      case 'refresh_count':
        return 'w-[100px]';
      case 'member_type':
        return 'min-w-[120px]';
      case 'created_at':
      case 'updated_at':
      case 'last_login_at':
        return 'min-w-[160px]';
      case 'actions':
        return 'w-[150px]';
      default:
        return 'min-w-[120px]';
    }
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '未知';
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
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
        {/* 统计信息卡片 */}
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-white p-4 rounded-md border flex items-center gap-4 flex-1">
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">{statusCounts['active'] || 0}</div>
              <div className="text-sm text-gray-600">已激活</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-600">{statusCounts['not-logged-in'] || 0}</div>
              <div className="text-sm text-gray-600">未登录</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-yellow-600">{statusCounts['need-setup'] || 0}</div>
              <div className="text-sm text-gray-600">需设置</div>
            </div>
            <div className="border-l h-10 mx-2"></div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">{memberTypeCounts['普通用户'] || 0}</div>
              <div className="text-sm text-gray-600">普通用户</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-orange-600">{memberTypeCounts['一次性用户'] || 0}</div>
              <div className="text-sm text-gray-600">一次性用户</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-purple-600">{memberTypeCounts['年费用户'] || 0}</div>
              <div className="text-sm text-gray-600">年费用户</div>
            </div>
          </div>
        </div>

        {/* 工具栏 */}
        <div className="flex items-center space-x-4 mb-4 flex-wrap gap-2">
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
            placeholder="搜索手机号/用户名/昵称"
            value={searchKeyword}
            onChange={(e) => {
              setSearchKeyword(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setSearchTerm(searchKeyword);
              }
            }}
            className="w-[240px]"
          />
          
          <Button onClick={() => setSearchTerm(searchKeyword)}>搜索</Button>
          
          <Select value={statusFilter || 'all'} onValueChange={(value) => setStatusFilter(value === 'all' ? null : value)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有状态</SelectItem>
              <SelectItem value="active">已激活</SelectItem>
              <SelectItem value="not-logged-in">未登录</SelectItem>
              <SelectItem value="need-setup">需设置</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={memberTypeFilter || 'all'} onValueChange={(value) => setMemberTypeFilter(value === 'all' ? null : value)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="用户类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有类型</SelectItem>
              <SelectItem value="普通用户">普通用户</SelectItem>
              <SelectItem value="一次性用户">一次性用户</SelectItem>
              <SelectItem value="年费用户">年费用户</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            onClick={() => {
              setSearchKeyword('');
              setSearchTerm('');
              setStatusFilter(null);
              setMemberTypeFilter(null);
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
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">手机号</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">昵称</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">用户类型</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="border-b">
                      <td className="px-4 py-3"><Skeleton className="h-4 w-[40px]" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-[120px]" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-[100px]" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-[60px]" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-[100px]" /></td>
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
                          {columnKey === 'id' ? (
                            user.id
                          ) : columnKey === 'status' ? (
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusInfo(user.status).className}`}>
                              {getStatusInfo(user.status).text}
                            </span>
                          ) : columnKey === 'created_at' || columnKey === 'updated_at' || columnKey === 'last_login_at' ? (
                            formatDate(user[columnKey])
                          ) : columnKey === 'notification_enabled' ? (
                            user.notification_enabled === 1 ? '已启用' : '已禁用'
                          ) : columnKey === 'registered' ? (
                            user.registered === 1 ? '已完善' : '未完善'
                          ) : columnKey === 'avatar' ? (
                            user.avatar ? (
                              <div className="w-10 h-10 relative">
                                <Image
                                  src={user.avatar}
                                  alt={user.nickname || user.username || '用户头像'}
                                  width={40}
                                  height={40}
                                  className="rounded-full object-cover"
                                />
                              </div>
                            ) : (
                              '无头像'
                            )
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
                            user[columnKey] || '-'
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
                    {Array.from({ length: Math.min(5, totalPages) }).map((_, index) => {
                      // 计算当前显示的页码
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = index + 1;
                      } else if (currentPage <= 3) {
                        pageNum = index + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + index;
                      } else {
                        pageNum = currentPage - 2 + index;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
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