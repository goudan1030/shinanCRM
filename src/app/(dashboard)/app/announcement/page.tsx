'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Send, Users, AlertCircle, Search, X, User, UserCheck, Smartphone, Bell, BellOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Member {
  id: number;
  member_no: string;
  nickname: string;
  phone: string;
  gender: string;
  city: string;
  status: string;
  pushStatus?: {
    hasDevice: boolean;
    isActive: boolean;
    platform?: string;
    lastActive?: string;
  };
}

export default function AnnouncementPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
  const [isTargeted, setIsTargeted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  // 搜索会员
  const searchMembers = async (keyword: string) => {
    if (!keyword.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/members?searchKeyword=${encodeURIComponent(keyword)}&page=1&pageSize=20`);
      const result = await response.json();

      if (result.success) {
        // 获取会员的推送状态
        const membersWithPushStatus = await Promise.all(
          (result.data || []).map(async (member: Member) => {
            try {
              const pushResponse = await fetch(`/api/messages/push/status/${member.id}`);
              if (pushResponse.ok) {
                const pushData = await pushResponse.json();
                // 添加调试信息
                console.log(`用户 ${member.id} 推送状态:`, pushData);
                return {
                  ...member,
                  pushStatus: pushData.success ? pushData.data : undefined
                };
              }
            } catch (error) {
              console.error('获取推送状态失败:', error);
            }
            return member;
          })
        );
        
        setSearchResults(membersWithPushStatus);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('搜索会员失败:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // 处理搜索输入
  useEffect(() => {
    const timer = setTimeout(() => {
      searchMembers(searchKeyword);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchKeyword]);

  // 选择会员
  const selectMember = (member: Member) => {
    // 检查用户是否有设备令牌
    if (!member.pushStatus || !member.pushStatus.hasDevice) {
      toast({
        title: "无法选择该用户",
        description: "该用户尚未注册设备令牌，无法接收推送通知",
        variant: "destructive"
      });
      return;
    }

    // 检查设备是否激活
    if (!member.pushStatus.isActive) {
      toast({
        title: "无法选择该用户",
        description: "该用户的设备令牌已被禁用，无法接收推送通知",
        variant: "destructive"
      });
      return;
    }

    // 检查是否已经选择过
    if (selectedMembers.find(m => m.id === member.id)) {
      toast({
        title: "用户已选择",
        description: "该用户已在选择列表中",
        variant: "default"
      });
      return;
    }

    // 添加到选择列表
    setSelectedMembers([...selectedMembers, member]);
    setSearchKeyword('');
    setSearchResults([]);
    
    toast({
      title: "用户已添加",
      description: `已添加用户 ${member.nickname || member.member_no} 到推送列表`,
      variant: "default"
    });
  };

  // 移除选中的会员
  const removeMember = (memberId: number) => {
    setSelectedMembers(selectedMembers.filter(m => m.id !== memberId));
  };

  // 清空选中的会员
  const clearSelectedMembers = () => {
    setSelectedMembers([]);
  };

  // 渲染推送状态图标
  const renderPushStatus = (member: Member) => {
    console.log(`渲染用户 ${member.id} 的推送状态:`, member.pushStatus);
    
    if (!member.pushStatus) {
      console.log(`用户 ${member.id}: pushStatus 为 undefined，显示"未注册"`);
      return (
        <div className="flex items-center space-x-1">
          <BellOff className="h-4 w-4 text-gray-400" />
          <span className="text-xs text-gray-500">未注册</span>
        </div>
      );
    }

    // 没有设备令牌
    if (!member.pushStatus.hasDevice) {
      console.log(`用户 ${member.id}: hasDevice 为 false，显示"无设备"`);
      return (
        <div className="flex items-center space-x-1">
          <Smartphone className="h-4 w-4 text-gray-400" />
          <span className="text-xs text-gray-500">无设备</span>
        </div>
      );
    }

    // 有设备令牌但被禁用
    if (member.pushStatus.hasDevice && !member.pushStatus.isActive) {
      console.log(`用户 ${member.id}: hasDevice 为 true，isActive 为 false，显示"已禁用"`);
      return (
        <div className="flex items-center space-x-1">
          <BellOff className="h-4 w-4 text-red-400" />
          <span className="text-xs text-red-500">已禁用</span>
        </div>
      );
    }

    // 有设备令牌且激活
    if (member.pushStatus.hasDevice && member.pushStatus.isActive) {
      console.log(`用户 ${member.id}: hasDevice 为 true，isActive 为 true，显示"可推送"`);
      return (
        <div className="flex items-center space-x-1">
          <Bell className="h-4 w-4 text-green-500" />
          <span className="text-xs text-green-600">可推送</span>
        </div>
      );
    }

    // 默认状态
    console.log(`用户 ${member.id}: 进入默认状态，显示"未知"`);
    return (
      <div className="flex items-center space-x-1">
        <BellOff className="h-4 w-4 text-gray-400" />
        <span className="text-xs text-gray-500">未知</span>
      </div>
    );
  };

  // 渲染推送状态详情
  const renderPushStatusDetail = (member: Member) => {
    if (!member.pushStatus) {
      return (
        <div className="text-xs text-gray-500">
          该用户尚未注册推送服务
        </div>
      );
    }

    // 没有设备令牌
    if (!member.pushStatus.hasDevice) {
      return (
        <div className="text-xs text-gray-500">
          该用户没有注册设备令牌
        </div>
      );
    }

    // 有设备令牌但被禁用
    if (member.pushStatus.hasDevice && !member.pushStatus.isActive) {
      return (
        <div className="text-xs text-gray-500">
          该用户的设备令牌已被禁用
        </div>
      );
    }

    // 有设备令牌且激活
    if (member.pushStatus.hasDevice && member.pushStatus.isActive) {
      return (
        <div className="text-xs text-gray-500">
          {member.pushStatus.platform && `${member.pushStatus.platform.toUpperCase()} • `}
          {member.pushStatus.lastActive ? `最后活跃: ${new Date(member.pushStatus.lastActive).toLocaleDateString()}` : '设备活跃'}
        </div>
      );
    }

    // 默认状态
    return (
      <div className="text-xs text-gray-500">
        推送状态未知
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      toast({
        title: "验证失败",
        description: "请填写标题和内容",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const payload: any = {
        title: title.trim(),
        content: content.trim()
      };

      // 如果启用了定向推送，使用选中的会员ID
      if (isTargeted && selectedMembers.length > 0) {
        payload.target_users = selectedMembers.map(member => member.id);
      }

      const response = await fetch('/api/messages/push/announcement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: "推送成功",
          description: result.message,
        });
        
        // 清空表单
        setTitle('');
        setContent('');
        setSelectedMembers([]);
        setIsTargeted(false);
      } else {
        toast({
          title: "推送失败",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "推送失败",
        description: "网络错误，请稍后重试",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Send className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">公告推送</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>发送公告</CardTitle>
          <CardDescription>
            向用户发送重要公告信息，支持全体推送或定向推送
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">公告标题 *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请输入公告标题"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">公告内容 *</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="请输入公告内容"
                rows={6}
                maxLength={1000}
              />
              <div className="text-sm text-gray-500">
                {content.length}/1000 字符
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="targeted"
                  checked={isTargeted}
                  onCheckedChange={setIsTargeted}
                />
                <Label htmlFor="targeted">定向推送</Label>
              </div>

              {isTargeted && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>目标会员</Label>
                    <div className="flex items-center space-x-2">
                      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                        <DialogTrigger asChild>
                          <Button type="button" variant="outline" size="sm">
                            <Search className="h-4 w-4 mr-2" />
                            搜索会员
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[80vh]">
                          <DialogHeader>
                            <DialogTitle>搜索并选择会员</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>搜索关键词</Label>
                              <Input
                                placeholder="输入会员编号、昵称、手机号进行搜索"
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                              />
                            </div>
                            
                            {/* 选择说明 */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <div className="flex items-center space-x-2 text-blue-800">
                                <AlertCircle className="h-4 w-4" />
                                <span className="text-sm font-medium">选择说明</span>
                              </div>
                              <div className="text-xs text-blue-700 mt-1 space-y-1">
                                <div>• <span className="font-medium">可推送</span>：用户已注册设备且设备激活，可以选择</div>
                                <div>• <span className="font-medium">无设备</span>：用户未注册设备，无法选择</div>
                                <div>• <span className="font-medium">已禁用</span>：用户设备被禁用，无法选择</div>
                              </div>
                            </div>
                            
                            <div className="h-64 overflow-y-auto border rounded-lg p-2">
                              {isSearching ? (
                                <div className="flex justify-center py-8">
                                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                </div>
                              ) : searchResults.length > 0 ? (
                                <div className="space-y-2">
                                  {searchResults.map((member) => {
                                    // 判断用户是否可选择
                                    const canSelect = member.pushStatus && 
                                                    member.pushStatus.hasDevice && 
                                                    member.pushStatus.isActive;
                                    
                                    return (
                                      <div
                                        key={member.id}
                                        className={`flex items-center justify-between p-3 border rounded-lg ${
                                          canSelect 
                                            ? 'hover:bg-gray-50 cursor-pointer' 
                                            : 'bg-gray-100 cursor-not-allowed opacity-60'
                                        }`}
                                        onClick={() => canSelect ? selectMember(member) : null}
                                      >
                                        <div className="flex items-center space-x-3 flex-1">
                                          <User className="h-5 w-5 text-gray-400" />
                                          <div className="flex-1">
                                            <div className="font-medium">
                                              {member.nickname || '未设置昵称'}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                              {member.member_no} • {member.phone} • {member.city}
                                            </div>
                                            {renderPushStatusDetail(member)}
                                          </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                          {renderPushStatus(member)}
                                          <Badge variant={member.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                            {member.status === 'ACTIVE' ? '激活' : '未激活'}
                                          </Badge>
                                          {!canSelect && (
                                            <Badge variant="outline" className="text-xs">
                                              不可选择
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : searchKeyword ? (
                                <div className="text-center py-8 text-gray-500">
                                  未找到匹配的会员
                                </div>
                              ) : (
                                <div className="text-center py-8 text-gray-500">
                                  请输入搜索关键词
                                </div>
                              )}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      {selectedMembers.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={clearSelectedMembers}
                        >
                          清空选择
                        </Button>
                      )}
                    </div>
                  </div>

                  {selectedMembers.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600">
                        已选择 {selectedMembers.length} 个会员：
                      </div>
                      <div className="space-y-2">
                        {selectedMembers.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                          >
                            <div className="flex items-center space-x-3 flex-1">
                              <UserCheck className="h-5 w-5 text-green-500" />
                              <div className="flex-1">
                                <div className="font-medium">
                                  {member.nickname || '未设置昵称'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {member.member_no} • {member.phone} • {member.city}
                                </div>
                                {renderPushStatusDetail(member)}
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              {renderPushStatus(member)}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeMember(member.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">
                      请点击"搜索会员"按钮选择目标会员，不选择则发送给所有用户
                    </div>
                  )}
                </div>
              )}
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                公告推送将立即发送给目标用户，请确保内容准确无误。
                {isTargeted && selectedMembers.length > 0 && (
                  <span className="block mt-1">
                    当前将发送给 {selectedMembers.length} 个指定会员
                  </span>
                )}
                {!isTargeted && (
                  <span className="block mt-1">
                    当前将发送给所有用户
                  </span>
                )}
              </AlertDescription>
            </Alert>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setTitle('');
                  setContent('');
                  setSelectedMembers([]);
                  setIsTargeted(false);
                }}
                disabled={isLoading}
              >
                清空
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    发送中...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    发送公告
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
