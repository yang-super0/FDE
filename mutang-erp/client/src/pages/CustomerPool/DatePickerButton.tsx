import dayjs from 'dayjs';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Calendar } from '@client/src/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/src/components/ui/popover';
import { cn } from '@client/src/lib/utils';

interface DatePickerButtonProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder: string;
}

export function DatePickerButton({
  value,
  onChange,
  placeholder,
}: DatePickerButtonProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'w-[140px] justify-start rounded-none text-left font-normal',
            !value && 'text-muted-foreground',
          )}
        >
          <CalendarIcon className="mr-1 size-3.5" />
          {value ? dayjs(value).format('YYYY-MM-DD') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} />
      </PopoverContent>
    </Popover>
  );
}
