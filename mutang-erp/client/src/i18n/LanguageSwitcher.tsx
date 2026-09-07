import type { FC } from 'react';
import { Languages } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { useI18n } from '@client/src/i18n';
import type { Locale } from '@client/src/i18n';

interface LocaleOption {
  value: Locale;
  label: string;
}

const LOCALE_OPTIONS: LocaleOption[] = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English' },
];

const LanguageSwitcher: FC = () => {
  const { locale, setLocale } = useI18n();

  return (
    <Select
      value={locale}
      onValueChange={(value: string): void => {
        const option: LocaleOption | undefined = LOCALE_OPTIONS.find(
          (item: LocaleOption) => item.value === value,
        );
        if (option) setLocale(option.value);
      }}
    >
      <SelectTrigger
        aria-label="Language"
        className="w-full h-8 rounded-none text-xs"
      >
        <Languages className="size-3.5" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="rounded-none">
        {LOCALE_OPTIONS.map((item: LocaleOption) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default LanguageSwitcher;
