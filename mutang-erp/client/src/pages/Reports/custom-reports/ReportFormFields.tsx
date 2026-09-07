import type { ReactNode } from 'react';
import { Checkbox } from '@client/src/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from '@client/src/components/ui/form';

interface RcFormSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  optional?: boolean;
}

/** 表单内通用 Select 字段（选项为字符串数组） */
export const RcFormSelect = ({
  label,
  value,
  onChange,
  options,
  optional,
}: RcFormSelectProps): ReactNode => (
  <FormItem>
    <FormLabel>
      {label}
      {optional ? null : ' *'}
    </FormLabel>
    <Select onValueChange={onChange} value={value || undefined}>
      <FormControl>
        <SelectTrigger className="rounded-none">
          <SelectValue placeholder={optional ? '可选' : `选择${label}`} />
        </SelectTrigger>
      </FormControl>
      <SelectContent className="rounded-none">
        {options.map((opt: string) => (
          <SelectItem key={opt} value={opt}>
            {opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <FormMessage />
  </FormItem>
);

interface RcFormCheckboxGroupProps {
  label: string;
  values: string[];
  options: string[];
  onChange: (next: string[]) => void;
}

/** 表单内通用 Checkbox 多选组 */
export const RcFormCheckboxGroup = ({
  label,
  values,
  options,
  onChange,
}: RcFormCheckboxGroupProps): ReactNode => (
  <FormItem>
    <FormLabel>{label} *</FormLabel>
    <div className="flex flex-wrap gap-4">
      {options.map((opt: string) => (
        <label key={opt} className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={values.includes(opt)}
            onCheckedChange={(checked: boolean | 'indeterminate') =>
              onChange(
                checked === true
                  ? [...values, opt]
                  : values.filter((v: string) => v !== opt),
              )
            }
          />
          {opt}
        </label>
      ))}
    </div>
    <FormMessage />
  </FormItem>
);
