import React, { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { ChevronLeft, ChevronRight, Inbox, Plus } from 'lucide-react';
import type {
  VideoMaterialListResponse,
  VideoMaterialOptions,
} from '@shared/video-material';
import {
  getVideoMaterialList,
  getVideoMaterialOptions,
} from '@client/src/api/video-material';
import { Button } from '@client/src/components/ui/button';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { MaterialsFilterBar } from './MaterialsFilterBar';
import { MaterialList } from './MaterialList';
import { CreateTaskDialog } from './CreateTaskDialog';
import { SyncStatusBanner } from './SyncStatusBanner';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

const MaterialsPage: React.FC = () => {
  const [keywordInput, setKeywordInput] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [videoType, setVideoType] = useState<string>('');
  const [targetPlatform, setTargetPlatform] = useState<string>('');
  const [processStatus, setProcessStatus] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [data, setData] = useState<VideoMaterialListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<VideoMaterialOptions | null>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [createDialogOpen, setCreateDialogOpen] = useState<boolean>(false);
  const [dataSource, setDataSource] = useState<'bitable' | 'local' | null>(
    null,
  );

  const lastKeywordRef = useRef<string>('');

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      const next: string = keywordInput.trim();
      if (next !== lastKeywordRef.current) {
        lastKeywordRef.current = next;
        setKeyword(next);
        setPage(1);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [keywordInput]);

  useEffect(() => {
    getVideoMaterialOptions()
      .then((result: VideoMaterialOptions) => setOptions(result))
      .catch((err: unknown) => {
        logger.error('获取素材筛选选项失败', err);
      });
  }, []);

  useEffect(() => {
    let cancelled: boolean = false;
    setLoading(true);
    setError(null);
    getVideoMaterialList({
      keyword: keyword || undefined,
      videoType: videoType || undefined,
      targetPlatform: targetPlatform || undefined,
      processStatus: processStatus || undefined,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((result: VideoMaterialListResponse) => {
        if (!cancelled) {
          setData(result);
          setDataSource(result.dataSource ?? null);
        }
      })
      .catch((err: unknown) => {
        logger.error('获取素材列表失败', err);
        if (!cancelled) {
          setError('素材列表加载失败，请稍后重试');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [keyword, videoType, targetPlatform, processStatus, page, reloadKey]);

  const handleVideoTypeChange = useCallback((value: string) => {
    setVideoType(value);
    setPage(1);
  }, []);

  const handleTargetPlatformChange = useCallback((value: string) => {
    setTargetPlatform(value);
    setPage(1);
  }, []);

  const handleProcessStatusChange = useCallback((value: string) => {
    setProcessStatus(value);
    setPage(1);
  }, []);

  const total: number = data?.total ?? 0;
  const totalPages: number = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const items = data?.items ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <Button
          size="sm"
          className="rounded-sm"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus />
          新建任务
        </Button>
      </div>

      <MaterialsFilterBar
        keywordInput={keywordInput}
        onKeywordInputChange={setKeywordInput}
        videoType={videoType}
        targetPlatform={targetPlatform}
        processStatus={processStatus}
        options={options}
        onVideoTypeChange={handleVideoTypeChange}
        onTargetPlatformChange={handleTargetPlatformChange}
        onProcessStatusChange={handleProcessStatusChange}
      />

      <SyncStatusBanner dataSource={dataSource} loading={loading} />

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_: unknown, idx: number) => (
            <Skeleton key={idx} className="h-[104px] w-full rounded-sm" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center gap-3 rounded-sm border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="rounded-sm"
            onClick={() => setReloadKey((key: number) => key + 1)}
          >
            重试
          </Button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-sm border border-dashed p-10 text-center">
          <Inbox className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">暂无匹配的素材</p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <MaterialList items={items} />
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-muted-foreground">
              共{' '}
              <span className="font-mono tabular-nums text-foreground">
                {total}
              </span>{' '}
              条素材 · 第{' '}
              <span className="font-mono tabular-nums text-foreground">
                {page}
              </span>{' '}
              /{' '}
              <span className="font-mono tabular-nums text-foreground">
                {totalPages}
              </span>{' '}
              页
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-sm"
                disabled={page <= 1}
                onClick={() => setPage((p: number) => Math.max(1, p - 1))}
              >
                <ChevronLeft />
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))}
              >
                下一页
                <ChevronRight />
              </Button>
            </div>
          </div>
        </>
      )}

      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
};

export default MaterialsPage;
