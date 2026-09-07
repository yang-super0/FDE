import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { SeFormField, toSeErrorText } from '../support-enhance-constants';
import { batchTagCreativeMaterials } from '@client/src/api/support-enhance/materials';

interface MaterialBatchTagDialogProps {
  open: boolean;
  ids: number[];
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}

type TagMode = 'add' | 'replace';

const MaterialBatchTagDialog = ({
  open,
  ids,
  onOpenChange,
  onDone,
}: MaterialBatchTagDialogProps) => {
  const [tags, setTags] = useState<string>('');
  const [mode, setMode] = useState<TagMode>('add');
  const [saving, setSaving] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string>('');

  useEffect(() => {
    if (open) {
      setTags('');
      setMode('add');
      setErrorText('');
    }
  }, [open]);

  const handleSubmit = async (): Promise<void> => {
    const parsedTags: string[] = tags
      .split(/[,，]/u)
      .map((item: string) => item.trim())
      .filter((item: string) => item !== '');
    if (parsedTags.length === 0) {
      setErrorText('请至少填写一个标签');
      return;
    }
    setSaving(true);
    try {
      const result = await batchTagCreativeMaterials(ids, parsedTags, mode);
      toast.success(`已更新 ${result.updated} 个素材的标签`);
      onOpenChange(false);
      onDone();
    } catch (error) {
      logger.error('批量打标签失败', error);
      setErrorText(toSeErrorText(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-md">
        <DialogHeader>
          <DialogTitle>批量打标签（已选 {ids.length} 个素材）</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <SeFormField label="标签（逗号分隔）" required>
            <Input
              className="rounded-none"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="如：节日,促销,新品"
            />
          </SeFormField>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">模式</label>
            <div className="flex gap-2">
              <Button
                data-ai-section-type="button"
                size="sm"
                variant={mode === 'add' ? 'default' : 'outline'}
                className="rounded-none"
                onClick={() => setMode('add')}
              >
                追加（add）
              </Button>
              <Button
                data-ai-section-type="button"
                size="sm"
                variant={mode === 'replace' ? 'default' : 'outline'}
                className="rounded-none"
                onClick={() => setMode('replace')}
              >
                替换（replace）
              </Button>
            </div>
          </div>
          {errorText ? (
            <p className="text-sm text-destructive">{errorText}</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-none"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            className="rounded-none"
            disabled={saving}
            onClick={() => void handleSubmit()}
          >
            {saving ? '提交中...' : '确认打标签'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MaterialBatchTagDialog;
