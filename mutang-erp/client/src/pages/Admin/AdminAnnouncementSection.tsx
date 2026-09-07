import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { Announcement } from '@shared/api.interface';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@client/src/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@client/src/components/ui/form';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  ReportCard,
  SectionHeader,
  StatusBadge,
} from '@client/src/components/blueprint';

interface AdminAnnouncementSectionProps {
  announcements: Announcement[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onPublish: (data: { title: string; content: string }) => Promise<boolean>;
}

const announcementSchema = z.object({
  title: z.string().min(1, '公告标题不能为空'),
  content: z.string().min(1, '公告正文不能为空'),
});

type AnnouncementFormData = z.infer<typeof announcementSchema>;

const AnnouncementPublishDialog = ({
  onPublish,
}: {
  onPublish: AdminAnnouncementSectionProps['onPublish'];
}) => {
  const [open, setOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const form = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { title: '', content: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({ title: '', content: '' });
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-ai-section-type="button">发布公告</Button>
      </DialogTrigger>
      <DialogContent className="rounded-none max-w-xl">
        <DialogHeader>
          <DialogTitle>发布公告</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(
              async (data: AnnouncementFormData) => {
                setSubmitting(true);
                const success: boolean = await onPublish({
                  title: data.title,
                  content: data.content,
                });
                setSubmitting(false);
                if (success) setOpen(false);
              },
            )}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    标题 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="请输入公告标题" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    正文 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      rows={6}
                      placeholder="请输入公告正文"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? '发布中...' : '确认发布'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

const AdminAnnouncementSection = ({
  announcements,
  total,
  page,
  pageSize,
  loading,
  onPageChange,
  onPublish,
}: AdminAnnouncementSectionProps) => {
  const totalPages: number = Math.max(Math.ceil(total / pageSize), 1);
  const latest: Announcement | undefined =
    page === 1 ? announcements[0] : undefined;
  const rest: Announcement[] = page === 1 ? announcements.slice(1) : announcements;

  return (
    <section>
      <SectionHeader no="03" label="ANNOUNCEMENTS" subtitle="公告管理" />
      <ReportCard>
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm font-bold">公告列表</div>
          <AnnouncementPublishDialog onPublish={onPublish} />
        </div>

        {loading && announcements.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            加载中...
          </div>
        ) : announcements.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            暂无公告
          </div>
        ) : (
          <div>
            {latest ? (
              <div className="border-l-4 border-[#0033A0] bg-accent p-6 mb-6">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <StatusBadge tone="info">最新</StatusBadge>
                  <span className="text-xs text-muted-foreground">
                    {dayjs(latest.createdAt).format('YYYY-MM-DD HH:mm')} ·
                    发布人：{latest.publisherName || '未知'}
                  </span>
                </div>
                <h3 className="text-lg font-bold mb-2 break-words">
                  {latest.title}
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                  {latest.content}
                </p>
              </div>
            ) : null}

            <div>
              {rest.map((item: Announcement) => (
                <div
                  key={item.id}
                  className="border-b border-border last:border-b-0 py-4 transition-colors hover:bg-accent/50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-bold break-words">
                      {item.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')} ·
                      发布人：{item.publisherName || '未知'}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2 break-words">
                    {item.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-6">
          <Button
            data-ai-section-type="button"
            variant="outline"
            size="sm"
            disabled={loading || page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            上一页
          </Button>
          <span className="text-xs text-muted-foreground font-mono">
            {page} / {totalPages}
          </span>
          <Button
            data-ai-section-type="button"
            variant="outline"
            size="sm"
            disabled={loading || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            下一页
          </Button>
        </div>
      </ReportCard>
    </section>
  );
};

export { AdminAnnouncementSection };
