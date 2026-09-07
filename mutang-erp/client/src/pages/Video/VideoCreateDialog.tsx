import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import dayjs from 'dayjs';
import { CalendarIcon } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import type { Customer } from '@shared/api.interface';
import { Button } from '@client/src/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Calendar } from '@client/src/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/src/components/ui/popover';
import { UserSelect } from '@client/src/components/business-ui/user-select';
import { cn } from '@client/src/lib/utils';
import {
  createVideoProject,
  listCustomersForSelect,
} from '@client/src/api/video';

const VIDEO_TYPE_OPTIONS: string[] = [
  '品牌宣传片',
  '产品广告片',
  '活动纪录片',
  '电商短视频',
  'TVC 广告',
];

const createVideoSchema = z.object({
  name: z.string().min(1, '请输入项目名称'),
  customerId: z.string().min(1, '请选择关联客户'),
  videoType: z.string().min(1, '请选择视频类型'),
  durationRequirement: z.string().min(1, '请输入时长要求'),
  deadline: z.date({ required_error: '请选择截止日期' }),
});

type CreateVideoFormData = z.infer<typeof createVideoSchema>;

interface VideoCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const VideoCreateDialog = ({
  open,
  onOpenChange,
  onCreated,
}: VideoCreateDialogProps) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState<boolean>(false);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const form = useForm<CreateVideoFormData>({
    resolver: zodResolver(createVideoSchema),
    defaultValues: {
      name: '',
      customerId: '',
      videoType: '',
      durationRequirement: '',
      deadline: dayjs().add(14, 'day').toDate(),
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled: boolean = false;
    setCustomersLoading(true);
    listCustomersForSelect()
      .then((items: Customer[]) => {
        if (!cancelled) {
          setCustomers(items);
        }
      })
      .catch((error: unknown) => {
        logger.error('加载客户列表失败', error);
        if (!cancelled) {
          toast.error('客户列表加载失败');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCustomersLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleSubmit = form.handleSubmit(async (data: CreateVideoFormData) => {
    setSubmitting(true);
    try {
      await createVideoProject({
        name: data.name,
        customerId: data.customerId,
        videoType: data.videoType,
        durationRequirement: data.durationRequirement,
        assigneeId: assigneeId ?? undefined,
        deadline: data.deadline.toISOString(),
      });
      toast.success('视频项目创建成功');
      form.reset();
      setAssigneeId(null);
      onOpenChange(false);
      onCreated();
    } catch (error) {
      logger.error('创建视频项目失败', error);
      toast.error('创建失败，请重试');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] rounded-none">
        <DialogHeader>
          <DialogTitle>新建视频项目</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    项目名称 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="请输入项目名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel>
                      关联客户 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              customersLoading ? '加载中...' : '请选择客户'
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.length === 0 && !customersLoading ? (
                          <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                            暂无客户数据
                          </div>
                        ) : (
                          customers.map((item: Customer) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="videoType"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel>
                      视频类型 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="请选择视频类型" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {VIDEO_TYPE_OPTIONS.map((option: string) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="durationRequirement"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel>
                      时长要求 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="如：60 秒以内" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel>
                      截止日期 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !field.value && 'text-muted-foreground',
                            )}
                          >
                            <CalendarIcon className="size-4" />
                            {field.value
                              ? dayjs(field.value).format('YYYY-MM-DD')
                              : '请选择截止日期'}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormItem>
              <FormLabel>负责人</FormLabel>
              <UserSelect
                value={assigneeId}
                onChange={setAssigneeId}
                placeholder="请选择负责人"
              />
            </FormItem>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? '创建中...' : '创建'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export { VideoCreateDialog };
