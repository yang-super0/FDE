import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import type { CreateVideoMaterialResponse } from '@shared/video-material';
import { createVideoMaterial } from '@client/src/api/video-material';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Input } from '@client/src/components/ui/input';

export interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateTaskDialog: React.FC<CreateTaskDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate();
  const [videoLink, setVideoLink] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (): Promise<void> => {
    const link: string = videoLink.trim();
    if (!link) {
      toast.error('请输入爆款视频链接');
      return;
    }
    if (!/^https?:\/\//u.test(link)) {
      toast.error('链接必须以 http:// 或 https:// 开头');
      return;
    }
    setSubmitting(true);
    try {
      const result: CreateVideoMaterialResponse =
        await createVideoMaterial(link);
      setVideoLink('');
      onOpenChange(false);
      toast.success('已创建并同步到多维表格');
      navigate(`/materials/${result.id}`);
    } catch (err) {
      logger.error('创建任务失败', err);
      const message: string =
        (err as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? '任务创建失败，请稍后重试';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next: boolean) => {
        if (submitting) {
          return;
        }
        if (!next) {
          setVideoLink('');
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="rounded-sm">
        <DialogHeader>
          <DialogTitle>新建任务</DialogTitle>
          <DialogDescription>
            粘贴爆款视频链接，提交后将创建任务并跳转到素材详情页
          </DialogDescription>
        </DialogHeader>
        <Input
          value={videoLink}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            setVideoLink(event.target.value)
          }
          onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter' && !submitting) {
              void handleSubmit();
            }
          }}
          placeholder="请粘贴爆款视频链接，如：https://..."
          className="rounded-sm"
          disabled={submitting}
        />
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            className="rounded-sm"
            onClick={() => {
              setVideoLink('');
              onOpenChange(false);
            }}
            disabled={submitting}
          >
            取消
          </Button>
          <Button
            size="sm"
            className="rounded-sm"
            onClick={() => void handleSubmit()}
            disabled={submitting}
          >
            {submitting ? '提交中…' : '提交'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
