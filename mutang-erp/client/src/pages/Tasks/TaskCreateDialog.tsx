import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { useCurrentUserProfile } from '@lark-apaas/client-toolkit/hooks/useCurrentUserProfile';
import { CalendarIcon } from 'lucide-react';
import type { TaskPriority } from '@shared/api.interface';
import { Button } from '@client/src/components/ui/button';
import { Calendar } from '@client/src/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/src/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { UserSelect } from '@client/src/components/business-ui/user-select';
import {
  createTask,
  type CreateTaskRequest,
} from '@client/src/api/tasks';

const taskSchema = z.object({
  title: z.string().min(1, '请输入任务标题'),
  description: z.string(),
  assigneeId: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  deadline: z.date().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const PRIORITY_OPTIONS: Array<{ value: TaskPriority; label: string }> = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];

const TaskCreateDialog = ({
  open,
  onOpenChange,
  onCreated,
}: TaskCreateDialogProps) => {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      assigneeId: '',
      priority: 'medium',
      deadline: dayjs().add(7, 'day').toDate(),
    },
  });

  const currentUser = useCurrentUserProfile();

  useEffect(() => {
    const currentUserId: string | undefined = currentUser?.user_id;
    if (currentUserId && !form.getValues('assigneeId')) {
      form.setValue('assigneeId', currentUserId);
    }
  }, [currentUser, form]);

  const handleSubmit = form.handleSubmit(async (data: TaskFormData) => {
    setSubmitting(true);
    try {
      const request: CreateTaskRequest = {
        title: data.title,
        description: data.description,
        assigneeId: data.assigneeId || (currentUser?.user_id ?? ''),
        priority: data.priority,
        deadline: data.deadline ? data.deadline.toISOString() : undefined,
      };
      await createTask(request);
      toast.success('任务创建成功');
      form.reset();
      onOpenChange(false);
      onCreated();
    } catch (error) {
      logger.error('创建任务失败', String(error));
      toast.error('创建任务失败，请重试');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>新建任务</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    任务标题 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="请输入任务标题" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>任务描述</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="请输入任务描述"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="assigneeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    负责人 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <UserSelect
                      value={field.value === '' ? null : field.value}
                      onChange={(value: string | null) =>
                        field.onChange(value ?? '')
                      }
                      placeholder="请选择负责人"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>
                      优先级 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-none">
                          <SelectValue placeholder="请选择优先级" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map(
                          (option: { value: TaskPriority; label: string }) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>
                      截止日期 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-start rounded-none text-left font-normal"
                          >
                            {field.value ? (
                              dayjs(field.value).format('YYYY-MM-DD')
                            ) : (
                              <span className="text-muted-foreground">
                                请选择截止日期
                              </span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-none"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" className="rounded-none" disabled={submitting}>
                {submitting ? '创建中...' : '创建任务'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export { TaskCreateDialog };
export type { TaskCreateDialogProps };
