import { useCallback, useEffect, useState } from 'react';
import {
  Table,
  type TableColumnsType,
} from '@lark-apaas/client-toolkit/antd-table';
import { Plus } from 'lucide-react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { Ticket, TicketStatus } from '@shared/api.interface';
import { ReportCard, StatusBadge } from '@client/src/components/blueprint';
import { Button } from '@client/src/components/ui/button';
import {
  getTicketList,
  updateTicket,
} from '@client/src/api/support';
import { TICKET_STATUS_FILTERS, TICKET_STATUS_META } from './support-constants';
import { SubmitTicketDialog } from './SubmitTicketDialog';
import { ResolveTicketDialog } from './ResolveTicketDialog';

const DEFAULT_PAGE_SIZE = 20;

interface SupportTicketPanelProps {
  onTicketChanged: () => void;
}

const SupportTicketPanel = ({ onTicketChanged }: SupportTicketPanelProps) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [statusFilter, setStatusFilter] = useState<'' | TicketStatus>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [submitOpen, setSubmitOpen] = useState<boolean>(false);
  const [resolvingTicket, setResolvingTicket] = useState<Ticket | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadTickets = useCallback(
    async (
      targetPage: number,
      targetPageSize: number,
      status: '' | TicketStatus,
    ) => {
      setLoading(true);
      try {
        const result = await getTicketList({
          status: status || undefined,
          page: targetPage,
          pageSize: targetPageSize,
        });
        setTickets(result.items);
        setTotal(result.total);
      } catch (error) {
        logger.error('获取工单列表失败', error);
        toast.error('获取工单列表失败');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadTickets(page, pageSize, statusFilter);
  }, [page, pageSize, statusFilter, loadTickets]);

  const reload = useCallback(() => {
    void loadTickets(page, pageSize, statusFilter);
  }, [loadTickets, page, pageSize, statusFilter]);

  const handleFilterChange = (value: '' | TicketStatus) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handlePageChange = (nextPage: number, nextPageSize: number) => {
    setPage(nextPage);
    setPageSize(nextPageSize);
  };

  const handleStartProcessing = async (ticket: Ticket) => {
    setActionLoadingId(ticket.id);
    try {
      await updateTicket(ticket.id, { status: 'processing' });
      toast.success('工单已开始处理');
      reload();
      onTicketChanged();
    } catch (error) {
      logger.error('开始处理失败', error);
      toast.error('开始处理失败，请重试');
    } finally {
      setActionLoadingId(null);
    }
  };

  const columns: TableColumnsType<Ticket> = [
    {
      title: '标题',
      dataIndex: 'title',
      width: 260,
      render: (title: string) => (
        <span className="font-bold text-primary">{title}</span>
      ),
    },
    { title: '分类', dataIndex: 'category', width: 110 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: TicketStatus) => (
        <StatusBadge tone={TICKET_STATUS_META[status].tone}>
          {TICKET_STATUS_META[status].label}
        </StatusBadge>
      ),
    },
    {
      title: '提交人',
      dataIndex: 'submitterName',
      width: 120,
      render: (name: string) => name || '—',
    },
    {
      title: '提交时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (value: string) => (
        <span className="font-mono text-xs">
          {dayjs(value).format('YYYY-MM-DD HH:mm')}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 170,
      render: (_: unknown, record: Ticket) => {
        if (record.status === 'pending') {
          return (
            <Button
              data-ai-section-type="button"
              size="sm"
              variant="outline"
              disabled={actionLoadingId === record.id}
              onClick={() => void handleStartProcessing(record)}
            >
              {actionLoadingId === record.id ? '处理中...' : '开始处理'}
            </Button>
          );
        }
        if (record.status === 'processing') {
          return (
            <Button
              data-ai-section-type="button"
              size="sm"
              onClick={() => setResolvingTicket(record)}
            >
              填写结果并解决
            </Button>
          );
        }
        return <span className="text-xs text-muted-foreground">—</span>;
      },
    },
  ];

  return (
    <ReportCard>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex flex-wrap gap-2">
          {TICKET_STATUS_FILTERS.map((filter) => (
            <Button
              key={filter.value || 'all'}
              data-ai-section-type="button"
              size="sm"
              variant={statusFilter === filter.value ? 'default' : 'outline'}
              onClick={() => handleFilterChange(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
        <Button data-ai-section-type="button" onClick={() => setSubmitOpen(true)}>
          <Plus className="h-4 w-4" />
          提交工单
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={tickets}
        loading={loading}
        rowKey="id"
        scroll={{ x: 950, y: 500 }}
        locale={{ emptyText: '暂无工单' }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: false,
          onChange: handlePageChange,
        }}
      />
      <SubmitTicketDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        onSubmitted={() => {
          reload();
          onTicketChanged();
        }}
      />
      <ResolveTicketDialog
        ticket={resolvingTicket}
        onClose={() => setResolvingTicket(null)}
        onResolved={() => {
          setResolvingTicket(null);
          reload();
          onTicketChanged();
        }}
      />
    </ReportCard>
  );
};

export { SupportTicketPanel };
export type { SupportTicketPanelProps };
