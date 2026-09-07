import { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Send } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import type { ReviewComment } from '@shared/api.interface';
import { Button } from '@client/src/components/ui/button';
import { Textarea } from '@client/src/components/ui/textarea';
import { Skeleton } from '@client/src/components/ui/skeleton';
import {
  addReviewComment,
  listReviewComments,
} from '@client/src/api/video';

interface VideoReviewCommentsProps {
  projectId: string;
}

const VideoReviewComments = ({ projectId }: VideoReviewCommentsProps) => {
  const [comments, setComments] = useState<ReviewComment[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [content, setContent] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchComments = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await listReviewComments(projectId);
      setComments(result.items);
    } catch (err) {
      logger.error('获取审片意见失败', err);
      toast.error('审片意见加载失败');
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void fetchComments();
  }, [fetchComments]);

  const handleSubmit = async (): Promise<void> => {
    const trimmed: string = content.trim();
    if (!trimmed) {
      toast.error('请输入审片意见内容');
      return;
    }
    setSubmitting(true);
    try {
      await addReviewComment(projectId, trimmed);
      toast.success('审片意见已提交');
      setContent('');
      await fetchComments();
    } catch (err) {
      logger.error('提交审片意见失败', err);
      toast.error('提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 rounded-none" />
          <Skeleton className="h-16 rounded-none" />
        </div>
      ) : !comments || comments.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          暂无审片意见
        </div>
      ) : (
        <div className="divide-y divide-border">
          {comments.map((comment: ReviewComment) => (
            <div key={comment.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-bold text-foreground">
                  {comment.creatorName || '匿名'}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {dayjs(comment.createdAt).format('YYYY-MM-DD HH:mm')}
                </span>
              </div>
              <p className="text-sm text-foreground leading-relaxed break-words">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="填写审片意见，如画面、节奏、字幕等修改建议"
          rows={3}
        />
        <div className="flex justify-end">
          <Button onClick={() => void handleSubmit()} disabled={submitting}>
            <Send className="size-4" />
            {submitting ? '提交中...' : '提交意见'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export { VideoReviewComments };
