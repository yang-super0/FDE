import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { CollaborationTask, TaskComment } from '@shared/api.interface';
import {
  createTaskComment,
  getCollaborationTask,
  listTaskComments,
} from '@client/src/api/task-enhance/collaboration-tasks';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Button } from '@client/src/components/ui/button';
import { Textarea } from '@client/src/components/ui/textarea';
import { Progress } from '@client/src/components/ui/progress';
import {
  UserDisplay,
} from '@client/src/components/business-ui/user-display';
import {
  TaskEnhancePriorityBadge,
  TaskEnhanceStatusBadge,
  formatTaskEnhanceDateTime,
  toTaskEnhanceErrorText,
} from '../task-enhance-shared';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

interface CollabTaskDetailDialogProps {
  open: boolean;
  taskId: number | null;
  onOpenChange: (open: boolean) => void;
}

const DETAIL_ITEMS: {
  key: keyof Pick<
    CollaborationTask,
    | 'taskNo'
    | 'taskType'
    | 'department'
    | 'startDate'
    | 'dueDate'
    | 'sourceModule'
    | 'sourceNo'
    | 'completedAt'
    | 'createdAt'
    | 'updatedAt'
  >;
  label: string;
}[] = [
  { key: 'taskNo', label: '任务编号' },
  { key: 'taskType', label: '任务类型' },
  { key: 'department', label: '部门' },
  { key: 'startDate', label: '开始日期' },
  { key: 'dueDate', label: '截止日期' },
  { key: 'sourceModule', label: '关联模块' },
  { key: 'sourceNo', label: '来源单据号' },
  { key: 'completedAt', label: '完成时间' },
  { key: 'createdAt', label: '创建时间' },
  { key: 'updatedAt', label: '更新时间' },
];

function detailText(value: string | null): string {
  return value ?? '—';
}

export function CollabTaskDetailDialog({
  open,
  taskId,
  onOpenChange,
}: CollabTaskDetailDialogProps) {
  const [task, setTask] = useState<CollaborationTask | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [content, setContent] = useState<string>('');
  const [attachmentsText, setAttachmentsText] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const loadDetail = useCallback(async (id: number): Promise<void> => {
    setLoading(true);
    try {
      const [taskResult, commentResult] = await Promise.all([
        getCollaborationTask(id),
        listTaskComments(id),
      ]);
      setTask(taskResult);
      setComments(commentResult);
    } catch (error: unknown) {
      logger.error(`加载任务详情失败: ${toTaskEnhanceErrorText(error)}`);
      toast.error(`加载任务详情失败：${toTaskEnhanceErrorText(error)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setTask(null);
      setComments([]);
      setContent('');
      setAttachmentsText('');
      return;
    }
    if (taskId !== null) void loadDetail(taskId);
  }, [open, taskId, loadDetail]);

  const parseAttachments = (): string[] => {
    return attachmentsText
      .split(/[,\n]/u)
      .map((item: string) => item.trim())
      .filter((item: string) => item.length > 0);
  };

  const handleAddComment = async (): Promise<void> => {
    if (taskId === null) return;
    const trimmedContent: string = content.trim();
    if (!trimmedContent) {
      toast.error('请输入评论内容');
      return;
    }
    setSubmitting(true);
    try {
      const attachments: string[] = parseAttachments();
      await createTaskComment(taskId, {
        content: trimmedContent,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      toast.success('评论已添加');
      setContent('');
      setAttachmentsText('');
      setComments(await listTaskComments(taskId));
    } catch (error: unknown) {
      logger.error(`添加评论失败: ${toTaskEnhanceErrorText(error)}`);
      toast.error(`添加评论失败：${toTaskEnhanceErrorText(error)}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-none sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            任务详情{task ? ` · ${task.title}` : ''}
          </DialogTitle>
          <DialogDescription>查看协作任务详情与评论动态</DialogDescription>
        </DialogHeader>
        {loading || !task ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            加载中...
          </div>
        ) : (
          <div className="space-y-5">
            {/* 基本信息 */}
            <div className="rounded-none border border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <TaskEnhanceStatusBadge status={task.status} />
                <TaskEnhancePriorityBadge priority={task.priority} />
                <span className="text-sm font-bold">{task.title}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {task.description ?? '暂无任务描述'}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <Progress value={task.progress} className="h-2 w-[220px]" />
                <span className="font-mono text-sm font-bold">
                  {task.progress}%
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">创建人：</span>
                  {task.creator ? (
                    <UserDisplay value={[task.creator]} size="small" />
                  ) : (
                    <span>—</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">负责人：</span>
                  {task.assignee ? (
                    <UserDisplay value={[task.assignee]} size="small" />
                  ) : (
                    <span>未分配</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">参与人：</span>
                  {task.participants && task.participants.length > 0 ? (
                    <UserDisplay value={task.participants} size="small" />
                  ) : (
                    <span>暂无</span>
                  )}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1.5 md:grid-cols-3">
                {DETAIL_ITEMS.map((item) => (
                  <div key={item.key} className="flex items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground">{item.label}：</span>
                    <span className="font-mono">
                      {detailText(task[item.key])}
                    </span>
                  </div>
                ))}
              </div>
              {task.remark ? (
                <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                  备注：{task.remark}
                </div>
              ) : null}
            </div>
            {/* 评论区 */}
            <div className="space-y-3">
              <div className="text-[11px] font-black uppercase tracking-[0.15em] text-primary">
                COMMENTS · 评论（{comments.length}）
              </div>
              <div className="max-h-[280px] space-y-3 overflow-y-auto rounded-none border border-border p-3">
                {comments.length === 0 ? (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    暂无评论
                  </div>
                ) : (
                  comments.map((comment: TaskComment) => (
                    <div
                      key={comment.id}
                      className="rounded-none border-b border-border pb-3 last:border-b-0 last:pb-0"
                    >
                      <div className="flex items-center gap-2">
                        {comment.commenter ? (
                          <UserDisplay
                            value={[comment.commenter]}
                            size="small"
                          />
                        ) : (
                          <span className="text-xs">—</span>
                        )}
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {formatTaskEnhanceDateTime(comment.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm">
                        {comment.content}
                      </p>
                      {comment.attachments && comment.attachments.length > 0 ? (
                        <div className="mt-1 flex flex-col gap-0.5">
                          {comment.attachments.map((url: string) => (
                            <UniversalLink
                              key={url}
                              to={url}
                              target="_blank"
                              rel="noreferrer"
                              className="break-words text-xs text-primary hover:underline"
                            >
                              {url}
                            </UniversalLink>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
              {/* 添加评论 */}
              <div className="space-y-2">
                <Textarea
                  placeholder="输入评论内容"
                  className="rounded-none resize-none"
                  rows={3}
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                />
                <Textarea
                  placeholder="选填，附件链接（多个用逗号或换行分隔）"
                  className="rounded-none resize-none"
                  rows={2}
                  value={attachmentsText}
                  onChange={(event) => setAttachmentsText(event.target.value)}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    disabled={submitting || !content.trim()}
                    onClick={() => void handleAddComment()}
                  >
                    {submitting ? '提交中...' : '添加评论'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
