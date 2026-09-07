import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { ArrowLeft, FileQuestion, Pencil, Trash2 } from 'lucide-react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import type {
  DeleteVideoMaterialResponse,
  VideoMaterialDetail,
} from '@shared/video-material';
import {
  deleteVideoMaterial,
  getVideoMaterialDetail,
} from '@client/src/api/video-material';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@client/src/components/ui/alert-dialog';
import { Badge } from '@client/src/components/ui/badge';
import { Button } from '@client/src/components/ui/button';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { EditMaterialDialog } from './EditMaterialDialog';
import { GenerationConfigSection } from './GenerationConfigSection';
import { VideoAndCopySection } from './VideoAndCopySection';
import { StoryboardSection } from './StoryboardSection';
import { GenerationParamsSection } from './GenerationParamsSection';
import { GeneratedVideosSection } from './GeneratedVideosSection';

function getStatusBadgeClass(status: string | null): string {
  if (!status) {
    return 'bg-muted text-muted-foreground';
  }
  if (status.includes('完成') || status.includes('已发布')) {
    return 'bg-[hsl(152_60%_42%)]/10 text-[hsl(152_60%_26%)]';
  }
  if (status.includes('进行') || status.includes('处理')) {
    return 'bg-[hsl(38_85%_50%)]/15 text-[hsl(28_80%_30%)]';
  }
  return 'bg-muted text-muted-foreground';
}

function firstLine(text: string | null): string {
  if (!text) {
    return '';
  }
  const line: string | undefined = text
    .split('\n')
    .find((l: string) => l.trim() !== '');
  return (line ?? '').trim();
}

const MaterialDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [material, setMaterial] = useState<VideoMaterialDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled: boolean = false;
    setLoading(true);
    setNotFound(false);
    setError(null);
    getVideoMaterialDetail(id)
      .then((result: VideoMaterialDetail) => {
        if (!cancelled) {
          setMaterial(result);
        }
      })
      .catch((err: unknown) => {
        const status: number | undefined = (
          err as { response?: { status?: number } }
        )?.response?.status;
        logger.error('获取素材详情失败', err);
        if (!cancelled) {
          if (status === 404) {
            setNotFound(true);
          } else {
            setError('素材详情加载失败，请稍后重试');
          }
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
  }, [id]);

  const handleBack = (): void => {
    navigate('/');
  };

  const handleRefresh = useCallback((detail: VideoMaterialDetail): void => {
    setMaterial(detail);
  }, []);

  const refetchDetail = useCallback((): void => {
    if (!id) {
      return;
    }
    getVideoMaterialDetail(id)
      .then((result: VideoMaterialDetail) => setMaterial(result))
      .catch((err: unknown) => {
        logger.error('刷新素材详情失败', err);
        toast.error('刷新详情失败，请稍后重试');
      });
  }, [id]);

  const handleDelete = async (): Promise<void> => {
    if (!id || deleting) {
      return;
    }
    setDeleting(true);
    try {
      const result: DeleteVideoMaterialResponse =
        await deleteVideoMaterial(id);
      toast.success(
        result.bitableSynced
          ? '已删除并同步多维表格'
          : '已删除，多维表格同步失败',
      );
      navigate('/');
    } catch (err: unknown) {
      logger.error('删除素材失败', err);
      const message: string =
        (err as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? '删除失败，请稍后重试';
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32 rounded-sm" />
        <Skeleton className="h-16 w-full rounded-sm" />
        <Skeleton className="aspect-video w-full rounded-sm" />
        <Skeleton className="h-40 w-full rounded-sm" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="rounded-sm" onClick={handleBack}>
          <ArrowLeft />
          返回素材库
        </Button>
        <div className="flex flex-col items-center gap-3 rounded-sm border border-dashed p-12 text-center">
          <FileQuestion className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">素材不存在</p>
          <Button variant="outline" size="sm" className="rounded-sm" onClick={handleBack}>
            返回素材库
          </Button>
        </div>
      </div>
    );
  }

  if (error || !material) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="rounded-sm" onClick={handleBack}>
          <ArrowLeft />
          返回素材库
        </Button>
        <div className="flex flex-col items-center gap-3 rounded-sm border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">
            {error ?? '素材详情加载失败'}
          </p>
        </div>
      </div>
    );
  }

  const summaryCopy: string =
    firstLine(material.videoCopyText) || firstLine(material.originalCopy) || '（无文案）';

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="-ml-2 rounded-sm" onClick={handleBack}>
            <ArrowLeft />
            返回素材库
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="rounded-sm"
              onClick={() => setEditOpen(true)}
            >
              <Pencil />
              编辑
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-sm text-red-600 hover:text-red-600"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 />
              删除
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-sm border bg-card p-4">
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            {summaryCopy}
          </p>
          <Badge
            variant="secondary"
            className={`rounded-sm font-normal ${getStatusBadgeClass(material.processStatus)}`}
          >
            {material.processStatus || '未知状态'}
          </Badge>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {material.createTime
              ? dayjs(material.createTime).format('YYYY-MM-DD')
              : '-'}
          </span>
        </div>
      </div>

      <GenerationConfigSection material={material} onRefresh={handleRefresh} />
      <VideoAndCopySection material={material} />
      <StoryboardSection material={material} />
      <GenerationParamsSection material={material} />
      <GeneratedVideosSection material={material} />

      <EditMaterialDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        material={material}
        onSaved={refetchDetail}
      />

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(next: boolean) => {
          if (!deleting) {
            setDeleteOpen(next);
          }
        }}
      >
        <AlertDialogContent className="rounded-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>删除素材</AlertDialogTitle>
            <AlertDialogDescription>
              将同时删除多维表格中的对应记录，此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-sm" disabled={deleting}>
              取消
            </AlertDialogCancel>
            <Button
              variant="destructive"
              size="sm"
              className="rounded-sm"
              onClick={() => void handleDelete()}
              disabled={deleting}
            >
              {deleting ? '删除中…' : '删除'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MaterialDetailPage;
