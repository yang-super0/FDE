import { useCallback, useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  Customer,
  CustomerStatus,
  Opportunity,
  OpportunityStage,
} from '@shared/api.interface';
import * as customerApi from '@client/src/api/customers';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { INDUSTRY_OPTIONS, STATUS_META } from './constants';
import { CustomerTable } from './CustomerTable';
import { CustomerDetailDialog } from './CustomerDetailDialog';
import { CustomerFormDialog } from './CustomerFormDialog';
import { OpportunityBoard } from './OpportunityBoard';
import { OpportunityFormDialog } from './OpportunityFormDialog';

const FILTER_ALL: string = 'all';

const Customers = () => {
  const [searchText, setSearchText] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [industry, setIndustry] = useState<string>(FILTER_ALL);
  const [status, setStatus] = useState<string>(FILTER_ALL);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [items, setItems] = useState<Customer[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [boardLoading, setBoardLoading] = useState<boolean>(false);

  const [detailCustomerId, setDetailCustomerId] = useState<string | null>(
    null,
  );
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(
    null,
  );
  const [opportunityFormOpen, setOpportunityFormOpen] =
    useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(searchText.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await customerApi.fetchCustomers({
        keyword: keyword || undefined,
        industry: industry === FILTER_ALL ? undefined : industry,
        status:
          status === FILTER_ALL ? undefined : (status as CustomerStatus),
        page,
        pageSize,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error) {
      const message: string =
        error instanceof Error ? error.message : String(error);
      logger.error(`加载客户列表失败: ${message}`);
      toast.error('加载客户列表失败');
    } finally {
      setLoading(false);
    }
  }, [keyword, industry, status, page, pageSize]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const loadOpportunities = useCallback(async () => {
    setBoardLoading(true);
    try {
      const result = await customerApi.fetchOpportunities();
      setOpportunities(result.items);
    } catch (error) {
      const message: string =
        error instanceof Error ? error.message : String(error);
      logger.error(`加载商机看板失败: ${message}`);
      toast.error('加载商机看板失败');
    } finally {
      setBoardLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOpportunities();
  }, [loadOpportunities]);

  const handleStageChange = useCallback(
    async (id: string, stage: OpportunityStage) => {
      try {
        await customerApi.updateOpportunityStage(id, stage);
        toast.success('商机阶段已更新');
        await loadOpportunities();
      } catch (error) {
        const message: string =
          error instanceof Error ? error.message : String(error);
        logger.error(`更新商机阶段失败: ${message}`);
        toast.error('更新商机阶段失败');
      }
    },
    [loadOpportunities],
  );

  return (
    <div className="space-y-8">
      <ReportCard>
        <SectionHeader
          no="01"
          label="CUSTOMER LIST"
          subtitle="客户档案 / 搜索筛选 / 跟进记录"
        />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-60">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="搜索客户名称"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
            </div>
            <Select
              value={industry}
              onValueChange={(value: string) => {
                setIndustry(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="行业" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FILTER_ALL}>全部行业</SelectItem>
                {INDUSTRY_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(value: string) => {
                setStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FILTER_ALL}>全部状态</SelectItem>
                {(Object.keys(STATUS_META) as CustomerStatus[]).map(
                  (key: CustomerStatus) => (
                    <SelectItem key={key} value={key}>
                      {STATUS_META[key].label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <Button
            data-ai-section-type="button"
            onClick={() => {
              setEditingCustomer(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            新建客户
          </Button>
        </div>
        <CustomerTable
          data={items}
          total={total}
          loading={loading}
          page={page}
          pageSize={pageSize}
          onPageChange={(nextPage: number, nextPageSize: number) => {
            setPage(nextPage);
            setPageSize(nextPageSize);
          }}
          onRowClick={(record: Customer) => setDetailCustomerId(record.id)}
          onEdit={(record: Customer) => {
            setEditingCustomer(record);
            setFormOpen(true);
          }}
        />
      </ReportCard>

      <ReportCard>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionHeader
            no="02"
            label="OPPORTUNITY BOARD"
            subtitle="商机阶段看板 / 拖拽卡片更新阶段"
          />
          <Button
            variant="outline"
            data-ai-section-type="button"
            onClick={() => setOpportunityFormOpen(true)}
          >
            <Plus className="h-4 w-4" />
            新建商机
          </Button>
        </div>
        <OpportunityBoard
          opportunities={opportunities}
          loading={boardLoading}
          onStageChange={handleStageChange}
        />
      </ReportCard>

      <CustomerDetailDialog
        customerId={detailCustomerId}
        onOpenChange={(open: boolean) => {
          if (!open) setDetailCustomerId(null);
        }}
        onEdit={(record: Customer) => {
          setEditingCustomer(record);
          setFormOpen(true);
        }}
      />
      <CustomerFormDialog
        open={formOpen}
        customer={editingCustomer}
        onOpenChange={setFormOpen}
        onSaved={() => {
          void loadCustomers();
        }}
      />
      <OpportunityFormDialog
        open={opportunityFormOpen}
        onOpenChange={setOpportunityFormOpen}
        onCreated={() => {
          void loadOpportunities();
        }}
      />
    </div>
  );
};

export default Customers;
