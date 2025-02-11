import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface UseDataTableProps {
  tableName: string;
  pageSize?: number;
  defaultSort?: {
    column: string;
    ascending: boolean;
  };
  defaultFilters?: Record<string, unknown>;
}

export function useDataTable<T>({ 
  tableName, 
  pageSize = 25,
  defaultSort = { column: 'created_at', ascending: false },
  defaultFilters = {}
}: UseDataTableProps) {
  const { toast } = useToast();
  const supabase = createClientComponentClient();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState(defaultFilters);

  const fetchData = useCallback(async () => {
    try {
      let query = supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .order(defaultSort.column, { ascending: defaultSort.ascending })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      // 应用过滤条件
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          if (typeof value === 'string' && value.includes('%')) {
            query = query.ilike(key, value);
          } else if (Array.isArray(value) && value.length === 2) {
            // 处理日期范围
            query = query.gte(key, value[0]).lte(key, value[1]);
          } else {
            query = query.eq(key, value);
          }
        }
      });

      const { data: result, error, count } = await query;

      if (error) throw error;

      setData(result || []);
      if (count !== null) {
        setTotalCount(count);
        setTotalPages(Math.ceil(count / pageSize));
      }
    } catch (error) {
      console.error(`获取${tableName}数据失败:`, error);
      toast({
        variant: 'destructive',
        title: `获取${tableName}数据失败`,
        description: error instanceof Error ? error.message : '操作失败，请重试'
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters, pageSize, supabase, tableName, toast, defaultSort]);

  const updateFilters = useCallback((newFilters: Record<string, unknown>) => {
    setFilters(newFilters);
    setCurrentPage(1); // 重置页码
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  return {
    data,
    loading,
    currentPage,
    totalPages,
    totalCount,
    filters,
    updateFilters,
    handlePageChange,
    fetchData
  };
}