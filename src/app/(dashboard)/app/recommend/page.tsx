'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useState, useEffect } from 'react';
import { Plus, Search, User, Phone, MapPin, Calendar, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

interface RecommendedMember {
  id: string;
  member_no: string;
  nickname: string;
  gender: string;
  birth_year: number;
  height: number;
  weight: number;
  phone: string;
  wechat: string;
  province: string;
  city: string;
  district: string;
  target_area: string;
  type: string;
  status: string;
  education: string;
  occupation: string;
  remaining_matches: number;
  created_at: string;
  updated_at: string;
}

interface SearchMember {
  id: string;
  member_no: string;
  nickname: string;
  gender: string;
  birth_year: number;
  phone: string;
  wechat: string;
  province: string;
  city: string;
  district: string;
  type: string;
  status: string;
  created_at: string;
}

export default function AppRecommendPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [members, setMembers] = useState<RecommendedMember[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<SearchMember[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // 获取推荐会员列表
  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        search: search
      });

      const response = await fetch(`/api/app/recommend?${params}`);
      const data = await response.json();

      if (data.success) {
        setMembers(data.data);
        setTotal(data.total);
      } else {
        toast({
          variant: 'destructive',
          title: '获取失败',
          description: data.error || '获取推荐会员列表失败'
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '获取失败',
        description: '网络错误，请重试'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 搜索会员
  const searchMembers = async (keyword: string) => {
    if (!keyword || keyword.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/app/recommend/search?search=${encodeURIComponent(keyword)}`);
      const data = await response.json();

      if (data.success) {
        setSearchResults(data.data);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // 添加推荐会员
  const addRecommendedMember = async (memberId: string) => {
    try {
      const response = await fetch('/api/app/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ memberId })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: '添加成功',
          description: `已将 ${data.data.nickname || data.data.memberNo} 添加为推荐会员`
        });
        setShowAddDialog(false);
        setSearchKeyword('');
        setSearchResults([]);
        fetchMembers(); // 刷新列表
      } else {
        toast({
          variant: 'destructive',
          title: '添加失败',
          description: data.error || '添加推荐会员失败'
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '添加失败',
        description: '网络错误，请重试'
      });
    }
  };

  // 取消推荐
  const removeRecommendedMember = async (memberId: string) => {
    try {
      const response = await fetch(`/api/app/recommend/${memberId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: '取消成功',
          description: `已取消 ${data.data.nickname || data.data.memberNo} 的推荐状态`
        });
        fetchMembers(); // 刷新列表
      } else {
        toast({
          variant: 'destructive',
          title: '取消失败',
          description: data.error || '取消推荐失败'
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '取消失败',
        description: '网络错误，请重试'
      });
    }
  };

  // 计算年龄
  const calculateAge = (birthYear: number) => {
    return new Date().getFullYear() - birthYear;
  };

  // 格式化性别
  const formatGender = (gender: string) => {
    return gender === 'male' ? '男' : gender === 'female' ? '女' : '未知';
  };

  // 格式化会员类型
  const formatType = (type: string) => {
    const typeMap: Record<string, string> = {
      'NORMAL': '普通会员',
      'ONE_TIME': '一次性会员',
      'ANNUAL': '年费会员'
    };
    return typeMap[type] || type;
  };

  // 格式化状态
  const formatStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'ACTIVE': '活跃',
      'INACTIVE': '非活跃',
      'REVOKED': '已撤销',
      'SUCCESS': '成功'
    };
    return statusMap[status] || status;
  };

  useEffect(() => {
    fetchMembers();
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchMembers(searchKeyword);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchKeyword]);

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* 页面头部 - 移动端优化 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">APP推荐管理</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            管理移动端应用的推荐会员列表
          </p>
        </div>
        <Button 
          onClick={() => setShowAddDialog(true)}
          className="w-full sm:w-auto"
          size="sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          新增推荐用户
        </Button>
      </div>

      {/* 搜索栏 - 移动端优化 */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Input
              placeholder="搜索会员编号、昵称、手机号或微信号..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* 推荐会员列表 - 移动端优化 */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-lg sm:text-xl">推荐会员列表</CardTitle>
          <CardDescription className="text-sm">
            当前共有 {total} 位推荐会员
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">加载中...</p>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">暂无推荐会员</p>
              <Button 
                variant="outline" 
                className="mt-4 w-full sm:w-auto"
                size="sm"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                添加第一个推荐会员
              </Button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {members.map((member) => (
                <div key={member.id} className="border rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                  {/* 移动端优化的会员卡片布局 */}
                  <div className="space-y-3">
                    {/* 头部信息 - 移动端垂直布局 */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-2 sm:space-y-0">
                      <div className="flex-1">
                        {/* 基本信息行 */}
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-2">
                          <h3 className="font-semibold text-base sm:text-lg">{member.nickname || '未设置昵称'}</h3>
                          <Badge variant="outline" className="text-xs">{member.member_no}</Badge>
                          <Badge variant={member.gender === 'male' ? 'default' : 'secondary'} className="text-xs">
                            {formatGender(member.gender)}
                          </Badge>
                          {member.birth_year && (
                            <Badge variant="outline" className="text-xs">{calculateAge(member.birth_year)}岁</Badge>
                          )}
                        </div>
                        
                        {/* 会员类型和状态 - 移动端单独一行 */}
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">{formatType(member.type)}</Badge>
                          <Badge variant={member.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
                            {formatStatus(member.status)}
                          </Badge>
                        </div>
                      </div>

                      {/* 操作按钮 - 移动端水平排列 */}
                      <div className="flex items-center justify-end space-x-2 sm:ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/members/${member.id}`, '_blank')}
                          className="flex-1 sm:flex-none"
                        >
                          <Eye className="h-3 w-3 sm:mr-1" />
                          <span className="hidden sm:inline">查看</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeRecommendedMember(member.id)}
                          className="flex-1 sm:flex-none"
                        >
                          <Trash2 className="h-3 w-3 sm:mr-1" />
                          <span className="hidden sm:inline">取消</span>
                        </Button>
                      </div>
                    </div>
                    
                    {/* 联系信息 - 移动端垂直布局 */}
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <Phone className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{member.phone || '未设置'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <User className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{member.wechat || '未设置'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{member.province} {member.city} {member.district}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span>注册于 {new Date(member.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* 个人资料 - 移动端垂直布局 */}
                    {(member.target_area || member.education || member.occupation) && (
                      <div className="space-y-1 text-sm border-t pt-2">
                        {member.target_area && (
                          <div className="flex flex-col sm:flex-row sm:items-center">
                            <span className="text-muted-foreground font-medium sm:mr-2">目标区域：</span>
                            <span className="truncate">{member.target_area}</span>
                          </div>
                        )}
                        {member.education && (
                          <div className="flex flex-col sm:flex-row sm:items-center">
                            <span className="text-muted-foreground font-medium sm:mr-2">学历：</span>
                            <span>{member.education}</span>
                          </div>
                        )}
                        {member.occupation && (
                          <div className="flex flex-col sm:flex-row sm:items-center">
                            <span className="text-muted-foreground font-medium sm:mr-2">职业：</span>
                            <span>{member.occupation}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 分页 - 移动端优化 */}
      {total > pageSize && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
            显示第 {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} 条，共 {total} 条
          </p>
          <div className="flex items-center justify-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="flex items-center"
            >
              <ChevronLeft className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">上一页</span>
            </Button>
            <span className="text-sm px-2 py-1 bg-gray-100 rounded">
              {page} / {Math.ceil(total / pageSize)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= Math.ceil(total / pageSize)}
              onClick={() => setPage(page + 1)}
              className="flex items-center"
            >
              <span className="hidden sm:inline">下一页</span>
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* 新增推荐用户对话框 - 移动端优化 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-lg sm:text-xl">新增推荐用户</DialogTitle>
            <DialogDescription className="text-sm">
              搜索并选择要添加为推荐用户的会员
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            <div className="flex-shrink-0">
              <Input
                placeholder="输入会员编号、昵称、手机号或微信号进行搜索..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full"
              />
            </div>

            {isSearching && (
              <div className="text-center py-4 flex-shrink-0">
                <p className="text-muted-foreground">搜索中...</p>
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {searchResults.map((member) => (
                  <div
                    key={member.id}
                    className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => addRecommendedMember(member.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
                          <span className="font-medium truncate">{member.nickname || '未设置昵称'}</span>
                          <Badge variant="outline" className="text-xs">{member.member_no}</Badge>
                          <Badge variant={member.gender === 'male' ? 'default' : 'secondary'} className="text-xs">
                            {formatGender(member.gender)}
                          </Badge>
                          {member.birth_year && (
                            <Badge variant="outline" className="text-xs">{calculateAge(member.birth_year)}岁</Badge>
                          )}
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground truncate">
                          {member.phone && `${member.phone} · `}
                          {member.wechat && `${member.wechat} · `}
                          {member.province} {member.city} {member.district}
                        </div>
                      </div>
                      <Button size="sm" className="ml-2 flex-shrink-0">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchKeyword && searchKeyword.length >= 2 && !isSearching && searchResults.length === 0 && (
              <div className="text-center py-4 flex-shrink-0">
                <p className="text-muted-foreground">未找到匹配的会员</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowAddDialog(false)}
              className="w-full sm:w-auto"
            >
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
