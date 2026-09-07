import { useEffect, useState, type ChangeEvent } from 'react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@client/src/components/ui/select';
import type { VideoCoreProject, VideoOrder } from '@shared/api.interface';
import {
  createVideoCoreProject, fetchApprovedVideoOrders, updateVideoCoreProject,
} from '@client/src/api/video-core/projects';
import { AdsDatePickerButton } from '@client/src/pages/AdsBusiness/AdsDatePickerButton';
import { toVideoErrorText, VideoFormField, VideoStatusBadge } from './video-constants';

const NO_SELECTION: string = 'none';

const reportError = (context: string, error: unknown): void => {
  logger.error(`${context}: ${toVideoErrorText(error)}`);
  toast.error(toVideoErrorText(error));
};

/* ============ 视频项目：新建 / 编辑 ============ */

interface ProjectFormState {
  projectName: string;
  orderId: string;
  customerName: string;
  projectType: string;
  projectManager: string;
  teamMembers: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  remark: string;
}

interface ProjectFormDialogProps {
  open: boolean;
  editing: VideoCoreProject | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

const emptyForm = (): ProjectFormState => ({
  projectName: '',
  orderId: NO_SELECTION,
  customerName: '',
  projectType: '',
  projectManager: '',
  teamMembers: '',
  startDate: undefined,
  endDate: undefined,
  remark: '',
});

export function ProjectFormDialog({ open, editing, onSaved, onOpenChange }: ProjectFormDialogProps) {
  const [form, setForm] = useState<ProjectFormState>(emptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [orders, setOrders] = useState<VideoOrder[]>([]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        projectName: editing.projectName,
        orderId: editing.orderId === null ? NO_SELECTION : String(editing.orderId),
        customerName: editing.customerName,
        projectType: editing.projectType,
        projectManager: editing.projectManager,
        teamMembers: editing.teamMembers.join(', '),
        startDate: editing.startDate ? dayjs(editing.startDate).toDate() : undefined,
        endDate: editing.endDate ? dayjs(editing.endDate).toDate() : undefined,
        remark: editing.remark,
      });
    } else {
      setForm(emptyForm());
    }
    let cancelled: boolean = false;
    fetchApprovedVideoOrders()
      .then((items) => { if (!cancelled) setOrders(items); })
      .catch((error: unknown) => { if (!cancelled) reportError('加载订单失败', error); });
    return () => { cancelled = true; };
  }, [open, editing]);

  const patch = <K extends keyof ProjectFormState>(key: K, value: ProjectFormState[K]): void =>
    setForm((prev: ProjectFormState) => ({ ...prev, [key]: value }));

  const handleSubmit = async (): Promise<void> => {
    if (!form.projectName.trim()) { toast.error('请输入项目名称'); return; }
    setSubmitting(true);
    try {
      const teamMembers: string[] = form.teamMembers
        .split(/[,，]/)
        .map((member: string) => member.trim())
        .filter((member: string) => member !== '');
      const startDate: string | undefined = form.startDate
        ? dayjs(form.startDate).format('YYYY-MM-DD') : undefined;
      const endDate: string | undefined = form.endDate
        ? dayjs(form.endDate).format('YYYY-MM-DD') : undefined;
      if (editing) {
        await updateVideoCoreProject(editing.id, {
          projectName: form.projectName.trim(),
          customerName: form.customerName.trim() || undefined,
          projectType: form.projectType.trim() || undefined,
          projectManager: form.projectManager.trim() || undefined,
          teamMembers,
          startDate,
          endDate,
          remark: form.remark.trim() || undefined,
        });
        toast.success('项目已更新');
      } else {
        await createVideoCoreProject({
          projectName: form.projectName.trim(),
          orderId: form.orderId === NO_SELECTION ? undefined : Number(form.orderId),
          customerName: form.customerName.trim() || undefined,
          projectType: form.projectType.trim() || undefined,
          projectManager: form.projectManager.trim() || undefined,
          teamMembers,
          startDate,
          endDate,
          remark: form.remark.trim() || undefined,
        });
        toast.success('项目已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportError('保存项目失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑项目' : '新建项目'}</DialogTitle>
          <DialogDescription>项目号由系统自动生成（XM+年月+序号）</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <VideoFormField label="项目名称" required>
            <Input className="rounded-none" value={form.projectName}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('projectName', event.target.value)} />
          </VideoFormField>
          <VideoFormField label="关联订单">
            <Select value={form.orderId} onValueChange={(value: string) => patch('orderId', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="选择已通过订单" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SELECTION}>不关联订单</SelectItem>
                {orders.map((order: VideoOrder) => (
                  <SelectItem key={order.id} value={String(order.id)}>
                    {`${order.orderNo}（${order.groupName}）`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </VideoFormField>
          <VideoFormField label="客户名称">
            <Input className="rounded-none" value={form.customerName}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('customerName', event.target.value)} />
          </VideoFormField>
          <VideoFormField label="项目类型">
            <Input className="rounded-none" value={form.projectType} placeholder="如：产品展示"
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('projectType', event.target.value)} />
          </VideoFormField>
          <VideoFormField label="项目负责人">
            <Input className="rounded-none" value={form.projectManager}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('projectManager', event.target.value)} />
          </VideoFormField>
          <VideoFormField label="团队成员">
            <Input className="rounded-none" value={form.teamMembers} placeholder="多人用逗号分隔"
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('teamMembers', event.target.value)} />
          </VideoFormField>
          <VideoFormField label="开始日期">
            <AdsDatePickerButton value={form.startDate} placeholder="开始日期"
              onChange={(date: Date | undefined) => patch('startDate', date)} />
          </VideoFormField>
          <VideoFormField label="结束日期">
            <AdsDatePickerButton value={form.endDate} placeholder="结束日期"
              onChange={(date: Date | undefined) => patch('endDate', date)} />
          </VideoFormField>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">备注</label>
            <Textarea className="rounded-none" rows={2} value={form.remark}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => patch('remark', event.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============ 视频项目：详情 ============ */

interface ProjectDetailDialogProps {
  open: boolean;
  project: VideoCoreProject | null;
  onOpenChange: (open: boolean) => void;
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <div className="text-xs uppercase font-black tracking-[0.15em] text-muted-foreground">{label}</div>
      <div className="text-sm break-words">{value || '—'}</div>
    </div>
  );
}

export function ProjectDetailDialog({ open, project, onOpenChange }: ProjectDetailDialogProps) {
  const formatDate = (value: string): string =>
    value ? dayjs(value).format('YYYY-MM-DD') : '—';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-none">
        <DialogHeader>
          <DialogTitle>{`${project?.projectNo ?? ''} ${project?.projectName ?? ''}`}</DialogTitle>
          <DialogDescription>项目详情</DialogDescription>
        </DialogHeader>
        {project ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <DetailField label="状态" value={project.status} />
              <DetailField label="关联订单" value={project.orderNo} />
              <DetailField label="客户名称" value={project.customerName} />
              <DetailField label="项目负责人" value={project.projectManager} />
              <DetailField label="开始日期" value={formatDate(project.startDate)} />
              <DetailField label="结束日期" value={formatDate(project.endDate)} />
              <DetailField label="进度" value={`${project.progress}%`} />
              <DetailField label="项目类型" value={project.projectType} />
            </div>
            {project.teamMembers.length > 0 ? (
              <div className="space-y-1.5">
                <div className="text-xs uppercase font-black tracking-[0.15em] text-muted-foreground">团队成员</div>
                <div className="flex flex-wrap gap-2">
                  {project.teamMembers.map((member: string) => (
                    <span key={member}
                      className="border border-border bg-accent px-2 py-0.5 text-xs">{member}</span>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <div className="text-xs uppercase font-black tracking-[0.15em] text-muted-foreground">项目节点</div>
              {project.nodes.length === 0 ? (
                <div className="text-sm text-muted-foreground">暂无节点，请在列表「节点管理」中添加</div>
              ) : (
                <div className="divide-y divide-border border border-border">
                  {project.nodes.map((node, index: number) => (
                    <div key={`${node.name}-${index}`}
                      className="flex items-center justify-between gap-4 px-3 py-2 text-sm">
                      <span className="font-medium">{node.name}</span>
                      <span className="text-muted-foreground">
                        {`计划 ${formatDate(node.plannedAt)} / 实际 ${formatDate(node.actualAt)}`}
                      </span>
                      <VideoStatusBadge status={node.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="text-xs uppercase font-black tracking-[0.15em] text-muted-foreground">交付物</div>
              {project.deliverables.length === 0 ? (
                <div className="text-sm text-muted-foreground">暂无交付物，请在列表「交付物管理」中添加</div>
              ) : (
                <div className="divide-y divide-border border border-border">
                  {project.deliverables.map((item, index: number) => (
                    <div key={`${item.name}-${index}`}
                      className="flex items-center justify-between gap-4 px-3 py-2 text-sm">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-muted-foreground">{item.type}</span>
                      <span className="text-muted-foreground">{formatDate(item.submittedAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {project.remark ? (
              <div className="space-y-1">
                <div className="text-xs uppercase font-black tracking-[0.15em] text-muted-foreground">备注</div>
                <div className="text-sm break-words">{project.remark}</div>
              </div>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
