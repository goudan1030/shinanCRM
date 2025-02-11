'use client';

import { Button } from '@/components/ui/button';

interface LoadingRowProps {
  colSpan?: number;
  message?: string;
}

export function LoadingRow({ colSpan = 7, message = '加载中...' }: LoadingRowProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-6 text-center text-sm text-gray-500">
        {message}
      </td>
    </tr>
  );
}

interface EmptyRowProps {
  colSpan?: number;
  message?: string;
}

export function EmptyRow({ colSpan = 7, message = '暂无数据' }: EmptyRowProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-6 text-center text-sm text-gray-500">
        {message}
      </td>
    </tr>
  );
}

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  loading?: boolean;
  disabled?: boolean;
}

export function ActionButton({
  label,
  onClick,
  variant = 'ghost',
  loading = false,
  disabled = false
}: ActionButtonProps) {
  return (
    <Button
      variant={variant}
      size="sm"
      onClick={onClick}
      disabled={loading || disabled}
      className="h-8 px-2"
    >
      {loading ? '处理中...' : label}
    </Button>
  );
}

interface DataTableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function DataTableHeader({ children, className = '' }: DataTableHeaderProps) {
  return (
    <th className={`px-4 py-3 text-left text-sm font-medium text-gray-500 ${className}`}>
      {children}
    </th>
  );
}

interface DataTableCellProps {
  children: React.ReactNode;
  className?: string;
}

export function DataTableCell({ children, className = '' }: DataTableCellProps) {
  return (
    <td className={`px-4 py-2 text-sm text-gray-900 ${className}`}>
      {children}
    </td>
  );
}