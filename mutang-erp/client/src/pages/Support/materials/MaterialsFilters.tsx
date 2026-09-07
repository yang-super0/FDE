import { RefreshCw } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import {
  SE_FILTER_ALL,
  SE_INDUSTRY_OPTIONS,
  SE_MATERIAL_STATUS_OPTIONS,
  SE_MATERIAL_TYPE_OPTIONS,
  SE_PLATFORM_OPTIONS,
} from '../support-enhance-constants';

export interface MaterialFilterState {
  nameFilter: string;
  typeFilter: string;
  industryFilter: string;
  platformFilter: string;
  tagFilter: string;
  ratingFilter: string;
  statusFilter: string;
}

interface MaterialsFiltersProps {
  state: MaterialFilterState;
  onChange: (patch: Partial<MaterialFilterState>) => void;
  onSearch: () => void;
  onReset: () => void;
}

const toOptions = (options: string[]): FilterOption[] =>
  options.map((opt: string) => ({ value: opt, label: opt }));

const RATING_OPTIONS: FilterOption[] = ['1', '2', '3', '4', '5'].map(
  (opt: string) => ({ value: opt, label: `${opt} 星` }),
);

interface FilterOption {
  value: string;
  label: string;
}

const FilterSelect = ({
  value,
  onChange,
  placeholder,
  allLabel,
  options,
  widthClass,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  allLabel: string;
  options: FilterOption[];
  widthClass: string;
}) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className={`${widthClass} rounded-none`}>
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent className="rounded-none">
      <SelectItem value={SE_FILTER_ALL}>{allLabel}</SelectItem>
      {options.map((opt: FilterOption) => (
        <SelectItem key={opt.value} value={opt.value}>
          {opt.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

const MaterialsFilters = ({
  state,
  onChange,
  onSearch,
  onReset,
}: MaterialsFiltersProps) => (
  <div className="mb-4 flex flex-wrap items-center gap-2">
    <Input
      className="w-40 rounded-none"
      placeholder="素材名称搜索"
      value={state.nameFilter}
      onChange={(e) => onChange({ nameFilter: e.target.value })}
    />
    <FilterSelect
      value={state.typeFilter}
      onChange={(v: string) => onChange({ typeFilter: v })}
      placeholder="类型"
      allLabel="全部类型"
      options={toOptions(SE_MATERIAL_TYPE_OPTIONS)}
      widthClass="w-24"
    />
    <FilterSelect
      value={state.industryFilter}
      onChange={(v: string) => onChange({ industryFilter: v })}
      placeholder="行业"
      allLabel="全部行业"
      options={toOptions(SE_INDUSTRY_OPTIONS)}
      widthClass="w-28"
    />
    <FilterSelect
      value={state.platformFilter}
      onChange={(v: string) => onChange({ platformFilter: v })}
      placeholder="平台"
      allLabel="全部平台"
      options={toOptions(SE_PLATFORM_OPTIONS)}
      widthClass="w-28"
    />
    <Input
      className="w-28 rounded-none"
      placeholder="标签"
      value={state.tagFilter}
      onChange={(e) => onChange({ tagFilter: e.target.value })}
    />
    <FilterSelect
      value={state.ratingFilter}
      onChange={(v: string) => onChange({ ratingFilter: v })}
      placeholder="评分"
      allLabel="全部评分"
      options={RATING_OPTIONS}
      widthClass="w-24"
    />
    <FilterSelect
      value={state.statusFilter}
      onChange={(v: string) => onChange({ statusFilter: v })}
      placeholder="状态"
      allLabel="全部状态"
      options={toOptions(SE_MATERIAL_STATUS_OPTIONS)}
      widthClass="w-24"
    />
    <Button
      data-ai-section-type="button"
      size="sm"
      variant="outline"
      className="rounded-none"
      onClick={onSearch}
    >
      查询
    </Button>
    <Button
      data-ai-section-type="button"
      size="sm"
      variant="outline"
      className="rounded-none"
      onClick={onReset}
    >
      <RefreshCw className="h-4 w-4" />
      重置
    </Button>
  </div>
);

export default MaterialsFilters;
