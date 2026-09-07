import { useEffect, useState, type ChangeEvent } from 'react';
import dayjs from 'dayjs';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@client/src/components/ui/select';
import type {
  VideoCoreDeliverable, VideoCoreProject, VideoCoreProjectNode,
} from '@shared/api.interface';
import {
  updateVideoCoreProjectDeliverables, updateVideoCoreProjectNodes,
} from '@client/src/api/video-core/projects';
import { AdsDatePickerButton } from '@client/src/pages/AdsBusiness/AdsDatePickerButton';
import { toVideoErrorText, VideoStatusBadge } from './video-constants';

const NODE_STATUS_OPTIONS: string[] = ['未开始', '进行中', '已完成'];

const reportError = (context: string, error: unknown): void => {
  logger.error(`${context}: ${toVideoErrorText(error)}`);
  toast.error(toVideoErrorText(error));
};

interface NodeRow {
  name: string;
  planned: Date | undefined;
  actual: Date | undefined;
  status: string;
}

const toNodeRow = (node: VideoCoreProjectNode): NodeRow => ({
  name: node.name,
  planned: node.plannedAt ? new Date(node.plannedAt) : undefined,
  actual: node.actualAt ? new Date(node.actualAt) : undefined,
  status: node.status,
});

const emptyDraft = (): NodeRow => ({ name: '', planned: undefined, actual: undefined, status: '未开始' });

interface NodeManageDialogProps {
  open: boolean;
  project: VideoCoreProject | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

export function NodeManageDialog({ open, project, onSaved, onOpenChange }: NodeManageDialogProps) {
  const [rows, setRows] = useState<NodeRow[]>([]);
  const [draft, setDraft] = useState<NodeRow>(emptyDraft());
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setRows((project?.nodes ?? []).map(toNodeRow));
    setDraft(emptyDraft());
  }, [open, project]);

  const patchRow = (index: number, patch: Partial<NodeRow>): void => {
    setRows((prev: NodeRow[]) => prev.map(
      (row: NodeRow, i: number) => (i === index ? { ...row, ...patch } : row),
    ));
  };

  const addDraft = (): void => {
    if (!draft.name.trim()) { toast.error('请输入节点名称'); return; }
    setRows((prev: NodeRow[]) => [...prev, draft]);
    setDraft(emptyDraft());
  };

  const handleSave = async (): Promise<void> => {
    if (!project) return;
    if (rows.some((row: NodeRow) => !row.name.trim())) { toast.error('节点名称不能为空'); return; }
    const nodes: VideoCoreProjectNode[] = rows.map((row: NodeRow) => ({
      name: row.name.trim(),
      plannedAt: row.planned ? dayjs(row.planned).format('YYYY-MM-DD') : '',
      actualAt: row.actual ? dayjs(row.actual).format('YYYY-MM-DD') : '',
      status: row.status as VideoCoreProjectNode['status'],
    }));
    setSubmitting(true);
    try {
      await updateVideoCoreProjectNodes(project.id, nodes);
      toast.success('节点已保存');
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportError('保存节点失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-none">
        <DialogHeader>
          <DialogTitle>节点管理</DialogTitle>
          <DialogDescription>{project ? `${project.projectNo} ${project.projectName}` : ''}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[420px] space-y-2 overflow-y-auto">
          {rows.length === 0 ? (
            <div className="border border-border p-4 text-sm text-muted-foreground">暂无节点，请在下方添加</div>
          ) : null}
          {rows.map((row: NodeRow, index: number) => (
            <div key={index} className="flex flex-wrap items-center gap-2 border border-border p-2">
              <Input className="w-40 rounded-none" placeholder="节点名称" value={row.name}
                onChange={(event: ChangeEvent<HTMLInputElement>) => patchRow(index, { name: event.target.value })} />
              <AdsDatePickerButton value={row.planned} placeholder="计划时间"
                onChange={(date: Date | undefined) => patchRow(index, { planned: date })} />
              <AdsDatePickerButton value={row.actual} placeholder="实际时间"
                onChange={(date: Date | undefined) => patchRow(index, { actual: date })} />
              <Select value={row.status} onValueChange={(value: string) => patchRow(index, { status: value })}>
                <SelectTrigger className="w-28 rounded-none"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NODE_STATUS_OPTIONS.map((option: string) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <VideoStatusBadge status={row.status} />
              <Button variant="ghost" size="sm" className="h-auto px-1 text-xs text-destructive"
                onClick={() => setRows((prev: NodeRow[]) => prev.filter((_: NodeRow, i: number) => i !== index))}>
                <Trash2 className="h-3.5 w-3.5" />
                删除
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2 border border-dashed border-border bg-accent/40 p-2">
            <Input className="w-40 rounded-none" placeholder="新节点名称" value={draft.name}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, name: event.target.value })} />
            <AdsDatePickerButton value={draft.planned} placeholder="计划时间"
              onChange={(date: Date | undefined) => setDraft({ ...draft, planned: date })} />
            <AdsDatePickerButton value={draft.actual} placeholder="实际时间"
              onChange={(date: Date | undefined) => setDraft({ ...draft, actual: date })} />
            <Select value={draft.status} onValueChange={(value: string) => setDraft({ ...draft, status: value })}>
              <SelectTrigger className="w-28 rounded-none"><SelectValue /></SelectTrigger>
              <SelectContent>
                {NODE_STATUS_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="rounded-none" onClick={addDraft}>
              <Plus className="h-3.5 w-3.5" />
              添加节点
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={submitting} onClick={() => void handleSave()}>
            {submitting ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeliverableRow {
  name: string;
  type: string;
  link: string;
  submitted: Date | undefined;
}

const toDeliverableRow = (item: VideoCoreDeliverable): DeliverableRow => ({
  name: item.name,
  type: item.type,
  link: item.link,
  submitted: item.submittedAt ? new Date(item.submittedAt) : undefined,
});

const emptyDeliverable = (): DeliverableRow => ({ name: '', type: '', link: '', submitted: undefined });

interface DeliverableManageDialogProps {
  open: boolean;
  project: VideoCoreProject | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

export function DeliverableManageDialog({ open, project, onSaved, onOpenChange }: DeliverableManageDialogProps) {
  const [rows, setRows] = useState<DeliverableRow[]>([]);
  const [draft, setDraft] = useState<DeliverableRow>(emptyDeliverable());
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setRows((project?.deliverables ?? []).map(toDeliverableRow));
    setDraft(emptyDeliverable());
  }, [open, project]);

  const patchRow = (index: number, patch: Partial<DeliverableRow>): void => {
    setRows((prev: DeliverableRow[]) => prev.map(
      (row: DeliverableRow, i: number) => (i === index ? { ...row, ...patch } : row),
    ));
  };

  const addDraft = (): void => {
    if (!draft.name.trim()) { toast.error('请输入交付物名称'); return; }
    setRows((prev: DeliverableRow[]) => [...prev, draft]);
    setDraft(emptyDeliverable());
  };

  const handleSave = async (): Promise<void> => {
    if (!project) return;
    if (rows.some((row: DeliverableRow) => !row.name.trim())) { toast.error('交付物名称不能为空'); return; }
    const deliverables: VideoCoreDeliverable[] = rows.map((row: DeliverableRow) => ({
      name: row.name.trim(),
      type: row.type.trim(),
      link: row.link.trim(),
      submittedAt: row.submitted ? dayjs(row.submitted).format('YYYY-MM-DD') : '',
    }));
    setSubmitting(true);
    try {
      await updateVideoCoreProjectDeliverables(project.id, deliverables);
      toast.success('交付物已保存');
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportError('保存交付物失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-none">
        <DialogHeader>
          <DialogTitle>交付物管理</DialogTitle>
          <DialogDescription>{project ? `${project.projectNo} ${project.projectName}` : ''}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[420px] space-y-2 overflow-y-auto">
          {rows.length === 0 ? (
            <div className="border border-border p-4 text-sm text-muted-foreground">暂无交付物，请在下方添加</div>
          ) : null}
          {rows.map((row: DeliverableRow, index: number) => (
            <div key={index} className="flex flex-wrap items-center gap-2 border border-border p-2">
              <Input className="w-36 rounded-none" placeholder="名称" value={row.name}
                onChange={(event: ChangeEvent<HTMLInputElement>) => patchRow(index, { name: event.target.value })} />
              <Input className="w-28 rounded-none" placeholder="类型" value={row.type}
                onChange={(event: ChangeEvent<HTMLInputElement>) => patchRow(index, { type: event.target.value })} />
              <Input className="w-56 rounded-none" placeholder="链接" value={row.link}
                onChange={(event: ChangeEvent<HTMLInputElement>) => patchRow(index, { link: event.target.value })} />
              <AdsDatePickerButton value={row.submitted} placeholder="提交时间"
                onChange={(date: Date | undefined) => patchRow(index, { submitted: date })} />
              <Button variant="ghost" size="sm" className="h-auto px-1 text-xs text-destructive"
                onClick={() => setRows((prev: DeliverableRow[]) => prev.filter((_: DeliverableRow, i: number) => i !== index))}>
                <Trash2 className="h-3.5 w-3.5" />
                删除
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2 border border-dashed border-border bg-accent/40 p-2">
            <Input className="w-36 rounded-none" placeholder="新交付物名称" value={draft.name}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, name: event.target.value })} />
            <Input className="w-28 rounded-none" placeholder="类型" value={draft.type}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, type: event.target.value })} />
            <Input className="w-56 rounded-none" placeholder="链接" value={draft.link}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, link: event.target.value })} />
            <AdsDatePickerButton value={draft.submitted} placeholder="提交时间"
              onChange={(date: Date | undefined) => setDraft({ ...draft, submitted: date })} />
            <Button variant="outline" size="sm" className="rounded-none" onClick={addDraft}>
              <Plus className="h-3.5 w-3.5" />
              添加交付物
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={submitting} onClick={() => void handleSave()}>
            {submitting ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
