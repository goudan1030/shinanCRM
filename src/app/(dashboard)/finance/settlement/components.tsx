'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { LoadingRow, EmptyRow, DataTableCell } from '@/components/ui/table';

interface SettlementRowProps {
  record: {
    id: string;
    settlement_date: string;
    amount: number;
    notes: string;
    created_at: string;
  };
  onEdit: () => void;
  onDelete: () => void;
}

export function SettlementRow({ record, onEdit, onDelete }: SettlementRowProps) {
  return (
    <tr className="hover:bg-gray-50 h-[48px]">
      <DataTableCell>
        {new Date(record.settlement_date).toLocaleDateString('zh-CN')}
      </DataTableCell>
      <DataTableCell>¥{record.amount.toLocaleString()}</DataTableCell>
      <DataTableCell>
        {new Date(record.created_at).toLocaleString('zh-CN')}
      </DataTableCell>
      <DataTableCell className="space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-8 px-2 text-primary"
        >
          编辑
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-8 px-2 text-destructive"
        >
          删除
        </Button>
      </DataTableCell>
    </tr>
  );
}

interface NewSettlementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: {
    expense_date: string;
    amount: string;
  };
  setData: (data: any) => void;
  loading: boolean;
  unsettledAmount: number;
  onSubmit: () => void;
}

export function NewSettlementDialog({
  open,
  onOpenChange,
  data,
  setData,
  loading,
  unsettledAmount,
  onSubmit
}: NewSettlementDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增结算</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">结算日期</label>
            <Input
              type="date"
              value={data.expense_date}
              onChange={(e) => setData({ ...data, expense_date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">结算金额</label>
            <Input
              type="number"
              value={data.amount}
              onChange={(e) => setData({ ...data, amount: e.target.value })}
              placeholder="请输入结算金额"
            />
            <p className="text-sm text-muted-foreground">
              当月待结算金额：¥{unsettledAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            取消
          </Button>
          <Button
            onClick={onSubmit}
            disabled={loading}
          >
            {loading ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  loading,
  onConfirm
}: DeleteConfirmDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="删除确认"
      description="确定要删除这条结算记录吗？此操作不可撤销。"
      confirmText="删除"
      variant="destructive"
      loading={loading}
      onConfirm={onConfirm}
    />
  );
}

interface EditSettlementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: {
    expense_date: string;
    amount: string;
    notes: string;
  };
  setData: (data: any) => void;
  loading: boolean;
  onSubmit: () => void;
}

export function EditSettlementDialog({
  open,
  onOpenChange,
  data,
  setData,
  loading,
  onSubmit
}: EditSettlementDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑结算</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">结算日期</label>
            <Input
              type="date"
              value={data.expense_date}
              onChange={(e) => setData({ ...data, expense_date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">结算金额</label>
            <Input
              type="number"
              value={data.amount}
              onChange={(e) => setData({ ...data, amount: e.target.value })}
              placeholder="请输入结算金额"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            取消
          </Button>
          <Button
            onClick={onSubmit}
            disabled={loading}
          >
            {loading ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { LoadingRow, EmptyRow };