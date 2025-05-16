import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ApiResponse<T> {
  data: T[];
  totalCount: number;
  success: boolean;
  message?: string;
}

interface UseDataTableProps {
  apiEndpoint: string;
  pageSize?: number;
  defaultSort?: {
    column: string;
    ascending: boolean;
  };
  defaultFilters?: Record<string, unknown>;
}

export function useDataTable<T>({ 
  apiEndpoint, 
  pageSize = 25,
  defaultSort = { column: 'created_at', ascending: false },
  defaultFilters = {}
}: UseDataTableProps) {
  const { toast } = useToast();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState(defaultFilters);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // 构建查询参数
      const queryParams = new URLSearchParams();
      queryParams.append('page', currentPage.toString());
      queryParams.append('pageSize', pageSize.toString());
      queryParams.append('sortColumn', defaultSort.column);
      queryParams.append('sortDirection', defaultSort.ascending ? 'asc' : 'desc');
      
      // 添加过滤条件
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            // 处理日期范围等数组类型数据
            queryParams.append(`${key}From`, value[0]?.toString() || '');
            queryParams.append(`${key}To`, value[1]?.toString() || '');
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });

      console.log('执行查询前的最终参数:', {
        apiEndpoint,
        查询参数: Object.fromEntries(queryParams.entries())
      });

      const response = await fetch(`${apiEndpoint}?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API请求错误: ${response.status}`);
      }

      const result = await response.json() as ApiResponse<T>;
      
      console.log('查询结果:', {
        总数: result.totalCount,
        当前页数据量: result.data?.length,
        第一条数据: result.data?.[0]
      });

      setData(result.data || []);
      setTotalCount(result.totalCount || 0);
      setTotalPages(Math.ceil((result.totalCount || 0) / pageSize));
    } catch (error) {
      console.error(`获取数据失败:`, error);
      toast({
        variant: 'destructive',
        title: `获取数据失败`,
        description: error instanceof Error ? error.message : '操作失败，请重试'
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters, pageSize, apiEndpoint, toast, defaultSort]);

  const updateFilters = useCallback((newFilters: Record<string, unknown>) => {
    console.log('筛选条件变化:', newFilters);
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