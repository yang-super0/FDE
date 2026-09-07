import React from 'react';
import { Search } from 'lucide-react';
import type { VideoMaterialOptions } from '@shared/video-material';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';

export interface MaterialsFilterBarProps {
  keywordInput: string;
  onKeywordInputChange: (value: string) => void;
  videoType: string;
  targetPlatform: string;
  processStatus: string;
  options: VideoMaterialOptions | null;
  onVideoTypeChange: (value: string) => void;
  onTargetPlatformChange: (value: string) => void;
  onProcessStatusChange: (value: string) => void;
}

interface FilterSelectProps {
  value: string;
  placeholder: string;
  optionList: string[];
  onChange: (value: string) => void;
}

const ALL_VALUE = '__all__';

const FilterSelect: React.FC<FilterSelectProps> = ({
  value,
  placeholder,
  optionList,
  onChange,
}) => (
  <Select
    value={value || ALL_VALUE}
    onValueChange={(next: string) => onChange(next === ALL_VALUE ? '' : next)}
  >
    <SelectTrigger size="sm" className="w-36 rounded-sm">
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value={ALL_VALUE}>全部</SelectItem>
      {optionList.map((option: string) => (
        <SelectItem key={option} value={option}>
          {option}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export const MaterialsFilterBar: React.FC<MaterialsFilterBarProps> = ({
  keywordInput,
  onKeywordInputChange,
  videoType,
  targetPlatform,
  processStatus,
  options,
  onVideoTypeChange,
  onTargetPlatformChange,
  onProcessStatusChange,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-64">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={keywordInput}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            onKeywordInputChange(event.target.value)
          }
          placeholder="搜索视频文案 / 原始文案"
          className="h-8 rounded-sm pl-8 text-sm"
        />
      </div>
      <FilterSelect
        value={videoType}
        placeholder="视频类型"
        optionList={options?.videoTypes ?? []}
        onChange={onVideoTypeChange}
      />
      <FilterSelect
        value={targetPlatform}
        placeholder="目标平台"
        optionList={options?.targetPlatforms ?? []}
        onChange={onTargetPlatformChange}
      />
      <FilterSelect
        value={processStatus}
        placeholder="处理状态"
        optionList={options?.processStatuses ?? []}
        onChange={onProcessStatusChange}
      />
    </div>
  );
};
