import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellRing, ExternalLink } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  ContractDetail,
  ContractExpense,
  ContractPaymentStatus,
  ContractReminder,
  ContractRemindType,
} from '@shared/api.interface';
import type { StatusTone } from '@client/src/components/blueprint';
import { StatusBadge } from '@client/src/components/blueprint';
import { Button } from '@client/src/components/ui/button';
import {
  Table,
  type TableProps,
} from '@lark-apaas/client-toolkit/antd-table';
import {
  listContractExpenses,
  listContractReminders,
} from '@client/src/api/contract-enhance';
import { ContractRemindDialog } from './ContractRemindDialog';
import { formatAmount, formatDate, formatDateTime } from './contract-ui';

const EXPENSE_PAGE_SIZE: number = 10;

const PAYMENT_STATUS_TONE: Record<ContractPaymentStatus, StatusTone> = {
  未付款: 'danger',
  部分付款: 'warning',
  已付款: 'success',
};

const REMIND_TYPE_TONE: Record<ContractRemindType, StatusTone> = {
  合同到期提醒: 'warning',
  待审批提醒: 'info',
  付款到期提醒: 'danger',
};

function toErrorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

interface ContractExpensesTabProps {
  contractId: string;
}

const ContractExpensesTab = ({ contractId }: ContractExpensesTabProps) => {
  const [items, setItems] = useState<ContractExpense[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await listContractExpenses({
        page,
        pageSize: EXPENSE_PAGE_SIZE,
        contractId,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (fetchError: unknown) {
      logger.error(`加载合同费用失败: ${toErrorText(fetchError)}`);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, contractId]);

  useEffect(() => {
    void fetchExpenses();
  }, [fetchExpenses]);

  const columns: TableProps<ContractExpense>['columns'] = [
    {
      title: '费用编号',
      dataIndex: 'expenseNo',
      key: 'expenseNo',
      width: 140,
      render: (expenseNo: string) => (
        <span className="font-mono text-primary font-bold">{expenseNo}</span>
      ),
    },
    {
      title: '费用类型',
      dataIndex: 'expenseType',
      key: 'expenseType',
      width: 110,
    },
    {
      title: '金额（元）',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
      render: (amount: number) => (
        <span className="font-mono">{formatAmount(amount)}</span>
      ),
    },
    {
      title: '已付金额（元）',
      dataIndex: 'paidAmount',
      key: 'paidAmount',
      width: 130,
      align: 'right',
      render: (paidAmount: number) => (
        <span className="font-mono">{formatAmount(paidAmount)}</span>
      ),
    },
    {
      title: '付款状态',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      width: 110,
      render: (paymentStatus: ContractPaymentStatus) => (
        <StatusBadge tone={PAYMENT_STATUS_TONE[paymentStatus]}>
          {paymentStatus}
        </StatusBadge>
      ),
    },
    {
      title: '计划付款日期',
      dataIndex: 'plannedPaymentDate',
      key: 'plannedPaymentDate',
      width: 120,
      render: (plannedPaymentDate: string | null) =>
        plannedPaymentDate ? formatDate(plannedPaymentDate) : '-',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" asChild>
          <Link to={`/contracts/expenses?contractId=${contractId}`}>
            <ExternalLink className="mr-1 size-3.5" />
            管理费用
          </Link>
        </Button>
      </div>
      {error ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <p className="text-sm text-muted-foreground">费用加载失败</p>
          <Button variant="outline" size="sm" onClick={() => void fetchExpenses()}>
            重试
          </Button>
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={items}
          loading={loading}
          rowKey="id"
          scroll={{ x: 760 }}
          pagination={{
            current: page,
            pageSize: EXPENSE_PAGE_SIZE,
            total,
            showSizeChanger: false,
            onChange: setPage,
          }}
        />
      )}
    </div>
  );
};

interface ContractRemindersTabProps {
  contract: ContractDetail;
}

const ContractRemindersTab = ({ contract }: ContractRemindersTabProps) => {
  const [items, setItems] = useState<ContractReminder[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const [remindOpen, setRemindOpen] = useState<boolean>(false);

  const fetchReminders = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await listContractReminders(contract.id);
      setItems(data);
    } catch (fetchError: unknown) {
      logger.error(`加载提醒记录失败: ${toErrorText(fetchError)}`);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [contract.id]);

  useEffect(() => {
    void fetchReminders();
  }, [fetchReminders]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => setRemindOpen(true)}>
          <BellRing className="mr-1 size-3.5" />
          发起提醒
        </Button>
      </div>
      {error ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <p className="text-sm text-muted-foreground">提醒记录加载失败</p>
          <Button variant="outline" size="sm" onClick={() => void fetchReminders()}>
            重试
          </Button>
        </div>
      ) : loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          加载中...
        </div>
      ) : items.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          暂无提醒记录
        </div>
      ) : (
        <div className="divide-y divide-border border border-border">
          {items.map((item: ContractReminder) => (
            <div key={item.id} className="space-y-1.5 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={REMIND_TYPE_TONE[item.remindType]}>
                  {item.remindType}
                </StatusBadge>
                <span className="text-xs text-muted-foreground">
                  对象：{item.targets.join('、') || '-'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(item.createdAt)}
                </span>
              </div>
              <p className="break-words text-sm text-foreground">
                {item.content || '-'}
              </p>
            </div>
          ))}
        </div>
      )}
      <ContractRemindDialog
        open={remindOpen}
        onOpenChange={setRemindOpen}
        contracts={[contract]}
        onDone={() => void fetchReminders()}
      />
    </div>
  );
};

export { ContractExpensesTab, ContractRemindersTab };
