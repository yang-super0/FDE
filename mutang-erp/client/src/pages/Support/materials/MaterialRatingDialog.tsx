import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { CreativeMaterial } from '@shared/api.interface';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { cn } from '@client/src/lib/utils';
import { toSeErrorText } from '../support-enhance-constants';
import { rateCreativeMaterial } from '@client/src/api/support-enhance/materials';

interface MaterialRatingDialogProps {
  open: boolean;
  record: CreativeMaterial | null;
  onOpenChange: (open: boolean) => void;
  onRated: () => void;
}

const MaterialRatingDialog = ({
  open,
  record,
  onOpenChange,
  onRated,
}: MaterialRatingDialogProps) => {
  const [rating, setRating] = useState<number>(0);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (open && record) setRating(record.rating);
  }, [open, record]);

  const handleSubmit = async (): Promise<void> => {
    if (!record || rating < 1) {
      toast.error('请先选择 1-5 星评分');
      return;
    }
    setSaving(true);
    try {
      await rateCreativeMaterial(record.id, rating);
      toast.success(`已将「${record.materialName}」评为 ${rating} 星`);
      onOpenChange(false);
      onRated();
    } catch (error) {
      logger.error('素材评分失败', error);
      toast.error(toSeErrorText(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-md">
        <DialogHeader>
          <DialogTitle>素材评分 · {record?.materialName ?? ''}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center gap-2 py-6">
          {[1, 2, 3, 4, 5].map((star: number) => (
            <button
              key={star}
              type="button"
              className="rounded-none transition-colors"
              onClick={() => setRating(star)}
              aria-label={`${star} 星`}
            >
              <Star
                className={cn(
                  'h-9 w-9 transition-colors',
                  star <= rating
                    ? 'fill-[#0033A0] text-[#0033A0]'
                    : 'text-border hover:text-[#4D94FF]',
                )}
              />
            </button>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground">
          当前选择：{rating > 0 ? `${rating} 星` : '未选择'}
        </p>
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
            {saving ? '提交中...' : '提交评分'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MaterialRatingDialog;
