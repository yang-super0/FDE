import type { ReactNode } from 'react';
import { Settings2 } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Checkbox } from '@client/src/components/ui/checkbox';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@client/src/components/ui/popover';
import type { ColumnSettingMeta } from '@client/src/hooks/useColumnSettings';

interface ColumnSettingsButtonProps {
  columnMetas: ColumnSettingMeta[];
  hiddenIds: string[];
  onToggle: (id: string, visible: boolean) => void;
  onReset: () => void;
  onSetAll: (visible: boolean) => void;
}

export function ColumnSettingsButton({
  columnMetas, hiddenIds, onToggle, onReset, onSetAll,
}: ColumnSettingsButtonProps): ReactNode {
  const allVisible = hiddenIds.length === 0;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="rounded-none gap-1.5">
          <Settings2 className="h-4 w-4" />
          列设置
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 rounded-none p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            显示列
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => onSetAll(true)}
            >
              全选
            </button>
            <span className="text-xs text-border">|</span>
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={onReset}
            >
              重置
            </button>
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {columnMetas.map((meta: ColumnSettingMeta) => (
            <label
              key={meta.id}
              className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm transition-colors hover:bg-accent"
            >
              <Checkbox
                checked={!hiddenIds.includes(meta.id)}
                onCheckedChange={(checked: boolean | 'indeterminate') =>
                  onToggle(meta.id, checked === true)}
              />
              <span className="truncate">{meta.label}</span>
            </label>
          ))}
        </div>
        <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
          {allVisible ? '全部列可见' : `已隐藏 ${hiddenIds.length} 列`}
        </div>
      </PopoverContent>
    </Popover>
  );
}
