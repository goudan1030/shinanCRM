'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MobileTableProps {
  data: any[];
  loading?: boolean;
  onItemClick?: (item: any) => void;
  renderItem?: (item: any, index: number) => React.ReactNode;
  emptyMessage?: string;
  className?: string;
}

interface MobileTableItemProps {
  title: string;
  subtitle?: string;
  description?: string;
  badges?: Array<{
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
    color?: string;
  }>;
  actions?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function MobileTable({
  data,
  loading = false,
  onItemClick,
  renderItem,
  emptyMessage = '暂无数据',
  className
}: MobileTableProps) {
  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        {[...Array(3)].map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
                <div className="h-8 w-16 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <p className="text-gray-500 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {data.map((item, index) => (
        <div key={item.id || index}>
          {renderItem ? renderItem(item, index) : (
            <Card 
              className={cn(
                "transition-all duration-200",
                onItemClick && "cursor-pointer hover:shadow-md"
              )}
              onClick={() => onItemClick?.(item)}
            >
              <CardContent className="p-4">
                <div className="text-sm text-gray-900">{JSON.stringify(item)}</div>
              </CardContent>
            </Card>
          )}
        </div>
      ))}
    </div>
  );
}

export function MobileTableItem({
  title,
  subtitle,
  description,
  badges = [],
  actions,
  onClick,
  className
}: MobileTableItemProps) {
  return (
    <Card 
      className={cn(
        "transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-md",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            {/* 主标题 */}
            <h3 className="font-medium text-gray-900 text-sm truncate">
              {title}
            </h3>
            
            {/* 副标题 */}
            {subtitle && (
              <p className="text-xs text-gray-600 mt-1 truncate">
                {subtitle}
              </p>
            )}
            
            {/* 描述信息 */}
            {description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                {description}
              </p>
            )}
            
            {/* 标签组 */}
            {badges.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {badges.map((badge, index) => (
                  <Badge 
                    key={index}
                    variant={badge.variant || 'secondary'}
                    className={cn(
                      "text-xs px-2 py-0.5",
                      badge.color && `bg-${badge.color}-100 text-${badge.color}-700 border-${badge.color}-200`
                    )}
                  >
                    {badge.text}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          {/* 操作按钮区域 */}
          {actions && (
            <div className="flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// 会员专用的移动端卡片组件
interface MemberMobileCardProps {
  member: {
    id: string;
    member_no: string;
    nickname?: string;
    wechat?: string;
    phone?: string;
    type: string;
    status: string;
    gender: string;
    remaining_matches: number;
    created_at: string;
    birth_year?: number;
    province?: string;
    city?: string;
  };
  onEdit?: (member: any) => void;
  onUpgrade?: (member: any) => void;
  onDelete?: (member: any) => void;
  onMatch?: (member: any) => void;
}

export function MemberMobileCard({ 
  member, 
  onEdit, 
  onUpgrade, 
  onDelete,
  onMatch 
}: MemberMobileCardProps) {
  const getMemberTypeText = (type: string, remainingMatches: number) => {
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return { text: '激活', variant: 'default' as const, color: 'green' };
      case 'revoked':
        return { text: '已撤销', variant: 'destructive' as const, color: 'red' };
      case 'pending':
        return { text: '待激活', variant: 'secondary' as const, color: 'yellow' };
      default:
        return { text: status, variant: 'outline' as const };
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'NORMAL':
        return { text: '普通', variant: 'outline' as const, color: 'blue' };
      case 'ONE_TIME':
        return { text: '一次性', variant: 'secondary' as const, color: 'purple' };
      case 'ANNUAL':
        return { text: '年费', variant: 'default' as const, color: 'green' };
      default:
        return { text: type, variant: 'outline' as const };
    }
  };

  const statusBadge = getStatusBadge(member.status);
  const typeBadge = getTypeBadge(member.type);

  return (
    <MobileTableItem
      title={`${member.member_no} ${member.nickname || '未设置昵称'}`}
      subtitle={`${member.wechat || '未设置微信'} | ${member.phone || '未设置手机'}`}
      description={`${member.gender === 'male' ? '男' : '女'} | ${member.birth_year || '未知'}年 | ${member.province || ''}${member.city || ''}`}
      badges={[
        statusBadge,
        typeBadge,
        { text: `剩余${member.remaining_matches}次`, variant: 'outline', color: 'gray' }
      ]}
      actions={
        <div className="flex flex-col gap-1">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 px-2"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(member);
            }}
          >
            编辑
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 px-2"
            onClick={(e) => {
              e.stopPropagation();
              onMatch?.(member);
            }}
          >
            匹配
          </Button>
        </div>
      }
    />
  );
} 