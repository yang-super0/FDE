import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  CustomReportListParams,
  CustomReportListResponse,
  CustomReportRecord,
} from '@shared/api.interface';
import { fetchCustomReports } from '@client/src/api/report-center/custom-reports';
import { RC_FILTER_ALL, toRcErrorText } from '../report-center-constants';

const REPORT_LIST_PAGE_SIZE: number = 20;

interface UseCustomReportsListResult {
  items: CustomReportRecord[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  typeFilter: string;
  keyword: string;
  publicOnly: boolean;
  setTypeFilter: (value: string) => void;
  setKeyword: (value: string) => void;
  setPublicOnly: (value: boolean) => void;
  handleSearch: () => void;
  handleReset: () => void;
  handlePageChange: (nextPage: number, nextPageSize: number) => void;
  reload: () => void;
}

export function useCustomReportsList(): UseCustomReportsListResult {
  const [items, setItems] = useState<CustomReportRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(REPORT_LIST_PAGE_SIZE);
  const [loading, setLoading] = useState<boolean>(false);
  const [typeFilter, setTypeFilter] = useState<string>(RC_FILTER_ALL);
  const [keyword, setKeyword] = useState<string>('');
  const [publicOnly, setPublicOnly] = useState<boolean>(false);
  const [applied, setApplied] = useState<{
    typeFilter: string;
    keyword: string;
    publicOnly: boolean;
  }>({ typeFilter: RC_FILTER_ALL, keyword: '', publicOnly: false });
  const [reloadFlag, setReloadFlag] = useState<number>(0);

  const loadList = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const params: CustomReportListParams = {
        page: String(page),
        pageSize: String(pageSize),
        reportType:
          applied.typeFilter === RC_FILTER_ALL ? undefined : applied.typeFilter,
        keyword: applied.keyword.trim() || undefined,
        publicOnly: applied.publicOnly ? 'true' : undefined,
      };
      const result: CustomReportListResponse = await fetchCustomReports(params);
      setItems(result.items);
      setTotal(result.total);
    } catch (error) {
      logger.error('获取自定义报表列表失败', error);
      toast.error(toRcErrorText(error));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, applied]);

  useEffect(() => {
    void loadList();
  }, [loadList, reloadFlag]);

  const handleSearch = useCallback((): void => {
    setPage(1);
    setApplied({ typeFilter, keyword, publicOnly });
  }, [typeFilter, keyword, publicOnly]);

  const handleReset = useCallback((): void => {
    setTypeFilter(RC_FILTER_ALL);
    setKeyword('');
    setPublicOnly(false);
    setPage(1);
    setApplied({ typeFilter: RC_FILTER_ALL, keyword: '', publicOnly: false });
  }, []);

  const handlePageChange = useCallback(
    (nextPage: number, nextPageSize: number): void => {
      setPage(nextPage);
      setPageSize(nextPageSize);
    },
    [],
  );

  const reload = useCallback((): void => {
    setReloadFlag((prev: number) => prev + 1);
  }, []);

  return {
    items,
    total,
    page,
    pageSize,
    loading,
    typeFilter,
    keyword,
    publicOnly,
    setTypeFilter,
    setKeyword,
    setPublicOnly,
    handleSearch,
    handleReset,
    handlePageChange,
    reload,
  };
}
