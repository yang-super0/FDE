import { useCallback, useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import type {
  Announcement,
  Asset,
  AssetStatus,
  AssetSummary,
} from '@shared/api.interface';
import * as adminApi from '@client/src/api/admin';
import { GradientHeader } from '@client/src/components/blueprint';
import { AdminAssetSection } from './AdminAssetSection';
import { AdminAnnouncementSection } from './AdminAnnouncementSection';

const DEFAULT_PAGE_SIZE = 20;

const getErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object') {
    const message = (
      error as { response?: { data?: { message?: string } } }
    ).response?.data?.message;
    if (message) return message;
  }
  return '操作失败，请稍后重试';
};

const Admin = () => {
  const [summary, setSummary] = useState<AssetSummary | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetTotal, setAssetTotal] = useState<number>(0);
  const [assetPage, setAssetPage] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<AssetStatus | 'all'>(
    'all',
  );
  const [assetLoading, setAssetLoading] = useState<boolean>(false);
  const [assetRefreshTick, setAssetRefreshTick] = useState<number>(0);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementTotal, setAnnouncementTotal] = useState<number>(0);
  const [announcementPage, setAnnouncementPage] = useState<number>(1);
  const [announcementLoading, setAnnouncementLoading] = useState<boolean>(
    false,
  );
  const [announcementRefreshTick, setAnnouncementRefreshTick] =
    useState<number>(0);

  const fetchSummary = useCallback(async (): Promise<void> => {
    try {
      const data: AssetSummary = await adminApi.getAssetSummary();
      setSummary(data);
    } catch (error) {
      logger.error('获取资产统计失败', error);
    }
  }, []);

  const fetchAssets = useCallback(
    async (page: number, status: AssetStatus | 'all'): Promise<void> => {
      setAssetLoading(true);
      try {
        const data = await adminApi.listAssets({
          status: status === 'all' ? undefined : status,
          page,
          pageSize: DEFAULT_PAGE_SIZE,
        });
        setAssets(data.items);
        setAssetTotal(data.total);
      } catch (error) {
        logger.error('获取资产列表失败', error);
        toast.error(getErrorMessage(error));
      } finally {
        setAssetLoading(false);
      }
    },
    [],
  );

  const fetchAnnouncements = useCallback(async (page: number): Promise<void> => {
    setAnnouncementLoading(true);
    try {
      const data = await adminApi.listAnnouncements({
        page,
        pageSize: DEFAULT_PAGE_SIZE,
      });
      setAnnouncements(data.items);
      setAnnouncementTotal(data.total);
    } catch (error) {
      logger.error('获取公告列表失败', error);
      toast.error(getErrorMessage(error));
    } finally {
      setAnnouncementLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchAssets(assetPage, statusFilter);
  }, [assetPage, statusFilter, assetRefreshTick, fetchAssets]);

  useEffect(() => {
    fetchAnnouncements(announcementPage);
  }, [announcementPage, announcementRefreshTick, fetchAnnouncements]);

  const refreshAssets = useCallback((): void => {
    setAssetPage(1);
    setAssetRefreshTick((tick: number) => tick + 1);
    fetchSummary();
  }, [fetchSummary]);

  const handleStatusFilterChange = (
    status: AssetStatus | 'all',
  ): void => {
    setStatusFilter(status);
    setAssetPage(1);
  };

  const handleCreateAsset = async (data: {
    name: string;
    assetNo: string;
    status: AssetStatus;
  }): Promise<boolean> => {
    try {
      await adminApi.createAsset(data);
      toast.success('资产登记成功');
      refreshAssets();
      return true;
    } catch (error) {
      logger.error('资产登记失败', error);
      toast.error(getErrorMessage(error));
      return false;
    }
  };

  const handleClaimAsset = async (id: string): Promise<boolean> => {
    try {
      await adminApi.claimAsset(id);
      toast.success('领用成功');
      refreshAssets();
      return true;
    } catch (error) {
      logger.error('资产领用失败', error);
      toast.error(getErrorMessage(error));
      return false;
    }
  };

  const handleReturnAsset = async (id: string): Promise<boolean> => {
    try {
      await adminApi.returnAsset(id);
      toast.success('归还成功');
      refreshAssets();
      return true;
    } catch (error) {
      logger.error('资产归还失败', error);
      toast.error(getErrorMessage(error));
      return false;
    }
  };

  const handlePublishAnnouncement = async (data: {
    title: string;
    content: string;
  }): Promise<boolean> => {
    try {
      await adminApi.createAnnouncement(data);
      toast.success('公告发布成功');
      setAnnouncementPage(1);
      setAnnouncementRefreshTick((tick: number) => tick + 1);
      return true;
    } catch (error) {
      logger.error('公告发布失败', error);
      toast.error(getErrorMessage(error));
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <GradientHeader
        title="行政管理"
        subtitle="Administration"
        meta="资产与公告管理"
      />
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 -mt-8 pb-12 space-y-8">
        <AdminAssetSection
          summary={summary}
          assets={assets}
          total={assetTotal}
          page={assetPage}
          pageSize={DEFAULT_PAGE_SIZE}
          loading={assetLoading}
          statusFilter={statusFilter}
          onStatusFilterChange={handleStatusFilterChange}
          onPageChange={(page: number) => setAssetPage(page)}
          onCreate={handleCreateAsset}
          onClaim={handleClaimAsset}
          onReturn={handleReturnAsset}
        />
        <AdminAnnouncementSection
          announcements={announcements}
          total={announcementTotal}
          page={announcementPage}
          pageSize={DEFAULT_PAGE_SIZE}
          loading={announcementLoading}
          onPageChange={(page: number) => setAnnouncementPage(page)}
          onPublish={handlePublishAnnouncement}
        />
      </div>
    </div>
  );
};

export default Admin;
