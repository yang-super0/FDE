import { useCallback, useEffect, useState } from 'react';
import {
  Table,
  type TableColumnsType,
} from '@lark-apaas/client-toolkit/antd-table';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { Plus } from 'lucide-react';
import { hrApi } from '@client/src/api';
import type {
  CreateLeaveRequest,
  LeaveApprovalAction,
} from '@client/src/api/hr';
import { ReportCard, StatusBadge } from '@client/src/components/blueprint';
import type { StatusTone } from '@client/src/components/blueprint';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@client/src/components/ui/form';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Textarea } from '@client/src/components/ui/textarea';
import type { LeaveRequest, LeaveStatus } from '@shared/api.interface';

const LEAVE_TYPES: string[] = ['年假', '事假', '病假', '调休'];

const LEAVE_STATUS_META: Record<LeaveStatus, { label: string; tone: StatusTone }> = {
  pending: { label: '待审批', tone: 'warning' },
  approved: { label: '已批准', tone: 'success' },
  rejected: { label: '已拒绝', tone: 'danger' },
};

const ALL_STATUS_VALUE = 'all';

/* ============ 发起请假弹窗 ============ */

const leaveSchema = z
  .object({
    leaveType: z.string().min(1, '请选择请假类型'),
    startTime: z.string().min(1, '请选择开始时间'),
    endTime: z.string().min(1, '请选择结束时间'),
    reason: z.string().min(1, '请假事由不能为空'),
  })
  .refine(
    (data) =>
      !data.startTime ||
      !data.endTime ||
      new Date(data.endTime).getTime() > new Date(data.startTime).getTime(),
    { message: '结束时间必须晚于开始时间', path: ['endTime'] },
  );

type LeaveFormData = z.infer<typeof leaveSchema>;

interface CreateLeaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const CreateLeaveDialog = ({
  open,
  onOpenChange,
  onCreated,
}: CreateLeaveDialogProps) => {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const form = useForm<LeaveFormData>({
    resolver: zodResolver(leaveSchema),
    defaultValues: { leaveType: '', startTime: '', endTime: '', reason: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({ leaveType: '', startTime: '', endTime: '', reason: '' });
    }
  }, [open, form]);

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      setSubmitting(true);
      const request: CreateLeaveRequest = {
        leaveType: data.leaveType,
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
        reason: data.reason,
      };
      await hrApi.createLeave(request);
      toast.success('请假申请已提交');
      onOpenChange(false);
      onCreated();
    } catch (error) {
      logger.error('提交请假申请失败:', error);
      toast.error('提交请假申请失败');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">发起请假</DialogTitle>
          <DialogDescription>填写请假信息并提交审批</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="leaveType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    请假类型 <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-none">
                        <SelectValue placeholder="请选择请假类型" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LEAVE_TYPES.map((type: string) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel>
                      开始时间 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel>
                      结束时间 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    请假事由 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="请简要说明请假事由"
                      className="min-h-20"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-none"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" className="rounded-none" disabled={submitting}>
                {submitting ? '提交中...' : '提交申请'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

/* ============ 请假审批区块 ============ */

export const LeaveSection = () => {
  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUS_VALUE);
  const [items, setItems] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [approvingId, setApprovingId] = useState<string>('');

  const fetchLeaves = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await hrApi.listLeaves(
        statusFilter === ALL_STATUS_VALUE
          ? undefined
          : (statusFilter as LeaveStatus),
      );
      setItems(res.items);
    } catch (error) {
      logger.error('加载请假列表失败:', error);
      toast.error('加载请假列表失败');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void fetchLeaves();
  }, [fetchLeaves]);

  const handleApprove = async (
    id: string,
    action: LeaveApprovalAction,
  ): Promise<void> => {
    try {
      setApprovingId(id);
      await hrApi.approveLeave(id, action);
      toast.success(action === 'approved' ? '已批准该请假申请' : '已拒绝该请假申请');
      await fetchLeaves();
    } catch (error) {
      logger.error('审批请假申请失败:', error);
      toast.error('审批失败，请稍后重试');
    } finally {
      setApprovingId('');
    }
  };

  const columns: TableColumnsType<LeaveRequest> = [
    {
      title: '申请人',
      dataIndex: 'applicantName',
      width: 120,
      fixed: 'left',
      render: (name: string) => (
        <span className="font-bold text-primary">{name || '—'}</span>
      ),
    },
    { title: '类型', dataIndex: 'leaveType', width: 90 },
    {
      title: '时间段',
      key: 'period',
      width: 260,
      render: (_: unknown, record: LeaveRequest) =>
        `${dayjs(record.startTime).format('YYYY-MM-DD HH:mm')} ~ ${dayjs(
          record.endTime,
        ).format('YYYY-MM-DD HH:mm')}`,
    },
    {
      title: '事由',
      dataIndex: 'reason',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: LeaveStatus) => {
        const meta = LEAVE_STATUS_META[status] ?? LEAVE_STATUS_META.pending;
        return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
      },
    },
    { title: '审批人', dataIndex: 'approverName', width: 100, render: (name: string) => name || '—' },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_: unknown, record: LeaveRequest) =>
        record.status === 'pending' ? (
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              className="rounded-none"
              disabled={approvingId === record.id}
              onClick={() => void handleApprove(record.id, 'approved')}
            >
              批准
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-none border-destructive text-destructive hover:bg-destructive/10"
              disabled={approvingId === record.id}
              onClick={() => void handleApprove(record.id, 'rejected')}
            >
              拒绝
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">已处理</span>
        ),
    },
  ];

  return (
    <ReportCard>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[11px] font-black uppercase tracking-[0.15em] text-primary">
          请假审批
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(value: string) => setStatusFilter(value)}
          >
            <SelectTrigger className="w-36 rounded-none">
              <SelectValue placeholder="筛选状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUS_VALUE}>全部状态</SelectItem>
              <SelectItem value="pending">待审批</SelectItem>
              <SelectItem value="approved">已批准</SelectItem>
              <SelectItem value="rejected">已拒绝</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            className="rounded-none"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="size-4" />
            发起请假
          </Button>
        </div>
      </div>
      <Table<LeaveRequest>
        columns={columns}
        dataSource={items}
        loading={loading}
        rowKey="id"
        scroll={{ x: 900, y: 500 }}
        pagination={{ pageSize: 10 }}
      />
      <CreateLeaveDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={() => void fetchLeaves()}
      />
    </ReportCard>
  );
};
