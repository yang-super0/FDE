import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import dayjs from 'dayjs';
import type { Customer, FollowRecord } from '@shared/api.interface';
import * as customerApi from '@client/src/api/customers';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Button } from '@client/src/components/ui/button';
import { Spinner } from '@client/src/components/ui/spinner';
import { StatusBadge } from '@client/src/components/blueprint';
import { STATUS_META } from './constants';
import { FollowRecordDialog } from './FollowRecordDialog';

interface CustomerDetailDialogProps {
  customerId: string | null;
  onOpenChange: (open: boolean) => void;
  onEdit: (customer: Customer) => void;
}

const CustomerDetailDialog = ({
  customerId,
  onOpenChange,
  onEdit,
}: CustomerDetailDialogProps) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [records, setRecords] = useState<FollowRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [followOpen, setFollowOpen] = useState<boolean>(false);

  const loadDetail = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const [customerData, recordsData] = await Promise.all([
        customerApi.fetchCustomer(id),
        customerApi.fetchFollowRecords(id),
      ]);
      setCustomer(customerData);
      setRecords(recordsData.items);
    } catch (error) {
      const message: string =
        error instanceof Error ? error.message : String(error);
      logger.error(`加载客户详情失败: ${message}`);
      toast.error('加载客户详情失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (customerId) {
      setCustomer(null);
      setRecords([]);
      void loadDetail(customerId);
    } else {
      setCustomer(null);
      setRecords([]);
      setFollowOpen(false);
    }
  }, [customerId, loadDetail]);

  const infoRows: Array<{ label: string; value: string }> = customer
    ? [
        { label: '行业', value: customer.industry },
        { label: '联系人', value: customer.contactName },
        { label: '联系电话', value: customer.contactPhone },
        { label: '客户来源', value: customer.source },
        {
          label: '创建时间',
          value: dayjs(customer.createdAt).format('YYYY-MM-DD HH:mm'),
        },
      ]
    : [];

  return (
    <Dialog
      open={Boolean(customerId)}
      onOpenChange={(open: boolean) => onOpenChange(open)}
    >
      <DialogContent className="rounded-none sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {customer ? (
              <>
                <span>{customer.name}</span>
                <StatusBadge tone={STATUS_META[customer.status].tone}>
                  {STATUS_META[customer.status].label}
                </StatusBadge>
              </>
            ) : (
              '客户详情'
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner />
          </div>
        ) : customer ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 border border-border p-4">
              {infoRows.map((row) => (
                <div key={row.label}>
                  <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                    {row.label}
                  </div>
                  <div className="text-sm mt-0.5 break-words">
                    {row.value}
                  </div>
                </div>
              ))}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                  操作
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1"
                  onClick={() => onEdit(customer)}
                >
                  编辑客户
                </Button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="text-[11px] font-black text-primary uppercase tracking-[0.15em]">
                  跟进记录
                </div>
                <Button size="sm" onClick={() => setFollowOpen(true)}>
                  <Plus className="h-4 w-4" />
                  添加跟进
                </Button>
              </div>
              {records.length === 0 ? (
                <div className="border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                  暂无跟进记录
                </div>
              ) : (
                <ol className="space-y-4 border-l border-border pl-4">
                  {records.map((record: FollowRecord) => (
                    <li key={record.id} className="relative">
                      <span className="absolute -left-[21px] top-1.5 h-2 w-2 bg-primary" />
                      <div className="text-xs text-muted-foreground">
                        {dayjs(record.createdAt).format('YYYY-MM-DD HH:mm')}
                        {' · '}
                        {record.method}
                        {' · '}
                        {record.creatorName || '未知用户'}
                      </div>
                      <p className="mt-1 text-sm whitespace-pre-wrap break-words">
                        {record.content}
                      </p>
                      {record.nextFollowAt ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          下次跟进：
                          {dayjs(record.nextFollowAt).format(
                            'YYYY-MM-DD HH:mm',
                          )}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-muted-foreground">
            暂无数据
          </div>
        )}

        {customer ? (
          <FollowRecordDialog
            open={followOpen}
            customerId={customer.id}
            onOpenChange={setFollowOpen}
            onCreated={() => {
              void loadDetail(customer.id);
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export { CustomerDetailDialog };
export type { CustomerDetailDialogProps };
