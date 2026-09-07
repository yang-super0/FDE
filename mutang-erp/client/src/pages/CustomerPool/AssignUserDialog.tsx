import { useState } from 'react';
import { toast } from 'sonner';
import { UserSelect } from '@client/src/components/business-ui/user-select';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';

interface AssignUserDialogProps {
  open: boolean;
  title: string;
  description: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (userId: string) => Promise<void>;
}

export function AssignUserDialog({
  open,
  title,
  description,
  onOpenChange,
  onSubmit,
}: AssignUserDialogProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!userId) {
      toast.error('请先选择人员');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(userId);
      setUserId(null);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen: boolean) => {
        if (!nextOpen) setUserId(null);
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="rounded-none sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <UserSelect
          value={userId}
          onChange={(next: string | null) => setUserId(next)}
          placeholder="请选择人员"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            data-ai-section-type="button"
            disabled={submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? '提交中...' : '确认分配'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
