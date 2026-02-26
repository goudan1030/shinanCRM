'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, AlertCircle } from 'lucide-react';

interface SyncResult {
  success: boolean;
  message: string;
  total?: number;
  processedCount?: number;
  successCount?: number;
  errorCount?: number;
  logs?: {
    memberId: number;
    memberNo: string;
    nickname: string | null;
    status: 'success' | 'error';
    message?: string;
  }[];
  finishedAt?: string;
}

export default function GoogleSheetsPage() {
  const { toast } = useToast();
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [processed, setProcessed] = useState(0);
  const [lastId, setLastId] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const runChunk = async (currentLastId: number | null) => {
    if (isPaused) return;

    try {
      const response = await fetch('/api/system/google-sheets-sync-chunk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lastId: currentLastId }),
      });

      const data: SyncResult & {
        error?: string;
        lastId?: number | null;
        batchCount?: number;
      } = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage = data.message || data.error || '同步失败，请检查配置';
        setSyncResult((prev) => ({
          ...(prev || {}),
          success: false,
          message: errorMessage,
          finishedAt: new Date().toISOString(),
        }));
        toast({
          title: '同步失败',
          description: errorMessage,
          variant: 'destructive',
        });
        setSyncLoading(false);
        return;
      }

      if (typeof data.total === 'number') {
        setTotal((prev) => (prev === null ? data.total! : prev));
      }

      const batchCount = data.processedCount ?? data.successCount ?? data.errorCount ?? 0;
      setProcessed((prev) => prev + batchCount);

      setSyncResult((prev) => ({
        success: true,
        message: data.message,
        total: data.total ?? prev?.total,
        successCount: (prev?.successCount ?? 0) + (data.successCount ?? 0),
        errorCount: (prev?.errorCount ?? 0) + (data.errorCount ?? 0),
        logs: [...(prev?.logs ?? []), ...(data.logs ?? [])],
        finishedAt: data.finishedAt ?? prev?.finishedAt,
      }));

      const nextLastId =
        typeof data.lastId === 'number' ? data.lastId : currentLastId ?? null;
      setLastId(nextLastId);

      if (data.finishedAt || isPaused) {
        setSyncLoading(false);
        if (data.finishedAt) {
          toast({
            title: '同步完成',
            description: data.message,
          });
        }
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      await runChunk(nextLastId);
    } catch (error) {
      console.error('分批同步失败:', error);
      const message = error instanceof Error ? error.message : '未知错误';
      setSyncResult((prev) => ({
        ...(prev || {}),
        success: false,
        message,
        finishedAt: new Date().toISOString(),
      }));
      toast({
        title: '同步失败',
        description: message,
        variant: 'destructive',
      });
      setSyncLoading(false);
    }
  };

  const startFullSync = async () => {
    setIsPaused(false);
    setSyncLoading(true);
    setSyncResult(null);
    setTotal(null);
    setProcessed(0);
    setLastId(null);
    await runChunk(null);
  };

  const togglePause = () => {
    setIsPaused((prev) => {
      const next = !prev;
      // 从“暂停”切回“继续”时，如果任务还在同步模式下，则从上次的 lastId 继续分批执行
      if (!next && syncLoading) {
        // 不要阻塞当前 setState，同步调起后续批次
        void runChunk(lastId);
      }
      return next;
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">谷歌表格同步</h1>
        <p className="text-gray-600 mt-1">
          点击下面的按钮，可以把当前数据库中的所有会员信息，同步到 Google Sheets。后面在 CRM 里修改会员资料时，也会自动更新对应行。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {syncLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <AlertCircle className="h-5 w-5 text-primary" />
            )}
            全量同步
          </CardTitle>
          <CardDescription>
            点击下面按钮，会将当前数据库中所有未删除的会员信息同步到 Google 表格。已经存在的行会按会员ID覆盖更新，新的会员会追加到表格末尾。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Button
              onClick={startFullSync}
              disabled={syncLoading}
              className="flex items-center gap-2"
            >
              {syncLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {syncLoading ? '同步中...' : '同步所有会员到 Google 表格'}
            </Button>

            <Button
              variant="outline"
              onClick={togglePause}
              disabled={!syncLoading}
              className="flex items-center gap-2"
            >
              {isPaused ? '继续' : '暂停'}
            </Button>
          </div>

          {syncResult && (
            <div className="mt-4 space-y-2 border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="font-medium text-gray-800">
                  {syncResult.success ? '同步结果' : '同步失败'}
                </div>
                {syncResult.finishedAt && (
                  <div className="text-xs text-gray-500">
                    完成时间：{new Date(syncResult.finishedAt).toLocaleString('zh-CN')}
                  </div>
                )}
              </div>

              {typeof syncResult.total === 'number' && (
                <div className="text-sm text-gray-700">
                  总数：{syncResult.total} 条，已处理：{processed} 条，成功：
                  {syncResult.successCount ?? 0} 条，失败：{syncResult.errorCount ?? 0} 条
                </div>
              )}

              {typeof syncResult.total === 'number' && (
                <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{
                      width: `${
                        total
                          ? Math.round((processed / total) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              )}

              {syncResult.logs && syncResult.logs.length > 0 && (
                <div className="mt-3 max-h-72 overflow-auto border rounded-md bg-gray-50 text-xs">
                  <div className="sticky top-0 bg-gray-100 px-3 py-2 font-medium text-gray-700 border-b">
                    同步日志（最多显示本次所有记录）
                  </div>
                  <ul className="divide-y">
                    {syncResult.logs.map((log) => (
                      <li key={log.memberId} className="px-3 py-2 flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="font-medium text-gray-800">
                            ID: {log.memberId}（{log.memberNo}）
                          </div>
                          {log.nickname && (
                            <div className="text-gray-600">昵称：{log.nickname}</div>
                          )}
                          {log.message && (
                            <div className="text-gray-500">错误：{log.message}</div>
                          )}
                        </div>
                        <div
                          className={`mt-1 text-[11px] px-2 py-0.5 rounded-full ${
                            log.status === 'success'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {log.status === 'success' ? '成功' : '失败'}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


