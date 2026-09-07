import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@client/src/components/ui/dialog';
import type {
  AdminEnhanceCheckDetailInput, AdminInventoryCheck, InventoryCheckDetail,
} from '@shared/api.interface';
import {
  fetchCheckDetails, submitCheckDetails,
} from '@client/src/api/admin-enhance/warehouse';
import { AdminStatusBadge } from '../admin-enhance-constants';
import { reportWarehouseError } from './warehouse-shared';

export type CheckDetailsMode = 'edit' | 'view';

interface CheckDetailsDialogProps {
  open: boolean;
  mode: CheckDetailsMode;
  check: AdminInventoryCheck | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

interface CheckDetailDraft {
  key: number;
  itemName: string;
  specification: string;
  bookQuantity: string;
  actualQuantity: string;
}

let draftKeySeed: number = 0;

const buildDraft = (): CheckDetailDraft => {
  draftKeySeed += 1;
  return {
    key: draftKeySeed,
    itemName: '',
    specification: '',
    bookQuantity: '0',
    actualQuantity: '',
  };
};

export function CheckDetailsDialog({
  open, mode, check, onSaved, onOpenChange,
}: CheckDetailsDialogProps) {
  const [drafts, setDrafts] = useState<CheckDetailDraft[]>([buildDraft()]);
  const [details, setDetails] = useState<InventoryCheckDetail[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const loadDetails = useCallback(async () => {
    if (!check) return;
    setLoading(true);
    try {
      const result = await fetchCheckDetails(check.id);
      setDetails(result.items);
    } catch (error: unknown) {
      reportWarehouseError('加载盘点明细失败', error);
    } finally {
      setLoading(false);
    }
  }, [check]);

  useEffect(() => {
    if (!open) return;
    if (mode === 'view') {
      setDetails([]);
      void loadDetails();
    } else {
      setDrafts([buildDraft()]);
    }
  }, [open, mode, loadDetails]);

  const patchDraft = (key: number, field: keyof CheckDetailDraft, value: string): void => {
    setDrafts((prev: CheckDetailDraft[]) => prev.map((draft: CheckDetailDraft) =>
      (draft.key === key ? { ...draft, [field]: value } : draft)));
  };

  const removeDraft = (key: number): void => {
    setDrafts((prev: CheckDetailDraft[]) =>
      prev.filter((draft: CheckDetailDraft) => draft.key !== key));
  };

  const handleSubmit = async (): Promise<void> => {
    if (!check) return;
    const inputs: AdminEnhanceCheckDetailInput[] = [];
    for (const draft of drafts) {
      if (!draft.itemName.trim()) {
        toast.error('请为每一行明细填写物品名称');
        return;
      }
      const bookQuantity: number = Number(draft.bookQuantity);
      if (!Number.isFinite(bookQuantity) || bookQuantity < 0) {
        toast.error(`「${draft.itemName}」账面数量必须为不小于 0 的数字`);
        return;
      }
      const actualQuantity: number | null = draft.actualQuantity.trim() === ''
        ? null
        : Number(draft.actualQuantity);
      if (actualQuantity != null && (!Number.isFinite(actualQuantity) || actualQuantity < 0)) {
        toast.error(`「${draft.itemName}」实际数量必须为不小于 0 的数字`);
        return;
      }
      inputs.push({
        itemName: draft.itemName.trim(),
        specification: draft.specification.trim(),
        bookQuantity,
        actualQuantity,
      });
    }
    if (inputs.length === 0) {
      toast.error('请至少登记一行盘点明细');
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitCheckDetails(check.id, { details: inputs });
      toast.success(`已提交 ${result.items.length} 条盘点明细`);
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportWarehouseError('提交盘点明细失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-none">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? '登记盘点明细' : '查看盘点明细'}
          </DialogTitle>
          <DialogDescription>
            {check
              ? `盘点单号：${check.inventoryCheckNo}（${check.checkDate} · ${check.checker}）`
              : ''}
          </DialogDescription>
        </DialogHeader>
        {mode === 'edit' ? (
          <>
            <div className="max-h-[420px] space-y-3 overflow-y-auto">
              {drafts.map((draft: CheckDetailDraft, index: number) => (
                <div key={draft.key} className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
                  <span className="w-8 shrink-0 font-mono text-xs text-muted-foreground">
                    {index + 1}.
                  </span>
                  <Input
                    className="w-36 rounded-none" placeholder="物品名称（必填）"
                    value={draft.itemName}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      patchDraft(draft.key, 'itemName', event.target.value)}
                  />
                  <Input
                    className="w-28 rounded-none" placeholder="规格（选填）"
                    value={draft.specification}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      patchDraft(draft.key, 'specification', event.target.value)}
                  />
                  <Input
                    className="w-24 rounded-none" type="number" min="0"
                    placeholder="账面数量"
                    value={draft.bookQuantity}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      patchDraft(draft.key, 'bookQuantity', event.target.value)}
                  />
                  <Input
                    className="w-24 rounded-none" type="number" min="0"
                    placeholder="实际数量"
                    value={draft.actualQuantity}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      patchDraft(draft.key, 'actualQuantity', event.target.value)}
                  />
                  <Button
                    variant="ghost" size="sm"
                    className="h-auto rounded-none px-1 text-destructive"
                    disabled={drafts.length <= 1}
                    onClick={() => removeDraft(draft.key)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="outline" size="sm" className="rounded-none"
              onClick={() => setDrafts((prev: CheckDetailDraft[]) => [...prev, buildDraft()])}
            >
              <Plus className="h-3.5 w-3.5" />
              添加一行
            </Button>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
              <Button disabled={submitting} onClick={() => void handleSubmit()}>
                {submitting ? '提交中...' : '批量提交明细'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="max-h-[420px] overflow-y-auto">
              {loading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">加载中...</div>
              ) : details.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">暂无盘点明细</div>
              ) : (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                      <th className="px-2 py-2">明细编号</th>
                      <th className="px-2 py-2">物品名称</th>
                      <th className="px-2 py-2">规格</th>
                      <th className="px-2 py-2 text-right">账面数量</th>
                      <th className="px-2 py-2 text-right">实际数量</th>
                      <th className="px-2 py-2 text-right">差异</th>
                      <th className="px-2 py-2">结果</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.map((detail: InventoryCheckDetail) => (
                      <tr key={detail.id} className="border-b border-border">
                        <td className="px-2 py-2 font-mono text-xs">{detail.detailNo}</td>
                        <td className="px-2 py-2">{detail.itemName}</td>
                        <td className="px-2 py-2">{detail.specification || '—'}</td>
                        <td className="px-2 py-2 text-right font-mono">{detail.bookQuantity}</td>
                        <td className="px-2 py-2 text-right font-mono">
                          {detail.actualQuantity ?? '—'}
                        </td>
                        <td className="px-2 py-2 text-right font-mono font-bold">
                          {detail.difference ?? '—'}
                        </td>
                        <td className="px-2 py-2">
                          <AdminStatusBadge status={detail.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
