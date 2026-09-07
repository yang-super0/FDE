import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { toast } from 'sonner';

import { logger } from '@lark-apaas/client-toolkit/logger';

import { createNotification } from '@client/src/api/message-notification';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Label } from '@client/src/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Textarea } from '@client/src/components/ui/textarea';

import {
  NOTIFY_MSG_TYPE_SYSTEM,
  NOTIFY_TARGET_ALL,
  PRIORITY_OPTIONS,
} from './constants';

export interface SendNotificationFormProps {
  onSent: () => void;
}

const SendNotificationForm: React.FC<SendNotificationFormProps> = ({
  onSent,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('normal');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('请填写通知标题和内容');
      return;
    }
    setSubmitting(true);
    try {
      await createNotification({
        msgType: NOTIFY_MSG_TYPE_SYSTEM,
        title: title.trim(),
        content: content.trim(),
        targetType: NOTIFY_TARGET_ALL,
        targetName: '全员',
        priority,
      });
      toast.success('系统通知已发送');
      setTitle('');
      setContent('');
      setPriority('normal');
      onSent();
    } catch (error) {
      logger.error('发送系统通知失败', error);
      toast.error('发送系统通知失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3 rounded-none border border-border border-t-[3px] border-t-primary bg-card p-4 shadow-md">
      <p className="text-xs font-black tracking-[0.15em] text-muted-foreground uppercase">
        发送系统通知（目标：全员）
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="notify-title" className="text-xs">
          标题
        </Label>
        <Input
          id="notify-title"
          className="rounded-none"
          placeholder="请输入通知标题"
          value={title}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            setTitle(event.target.value)
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notify-content" className="text-xs">
          内容
        </Label>
        <Textarea
          id="notify-content"
          className="min-h-20 rounded-none"
          placeholder="请输入通知内容"
          value={content}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
            setContent(event.target.value)
          }
        />
      </div>
      <div className="flex items-end gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">优先级</Label>
          <Select value={priority} onValueChange={(value: string) => setPriority(value)}>
            <SelectTrigger size="sm" className="w-[120px] rounded-none">
              <SelectValue placeholder="优先级" />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              {PRIORITY_OPTIONS.map((opt: { value: string; label: string }) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          className="ml-auto rounded-none"
          disabled={submitting}
          onClick={() => void handleSubmit()}
        >
          <Send className="size-4" />
          {submitting ? '发送中...' : '发送通知'}
        </Button>
      </div>
    </div>
  );
};

export { SendNotificationForm };
