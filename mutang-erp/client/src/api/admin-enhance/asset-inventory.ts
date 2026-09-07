import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  AdminAsset,
  AdminEnhanceAssetStats,
  AdminEnhanceBatchIdsDto,
  AdminEnhanceInventoryStats,
  AdminEnhanceListParams,
  AdminEnhanceListResponse,
  AdminInventoryItem,
  CreateAdminAssetDto,
  CreateAdminInventoryItemDto,
  UpdateAdminAssetDto,
  UpdateAdminInventoryItemDto,
} from '@shared/api.interface';

const ASSETS_BASE: string = '/api/admin-enhance/assets';
const INVENTORY_BASE: string = '/api/admin-enhance/inventory';

async function getJson<T>(url: string): Promise<T> {
  const response = await axiosForBackend({ url, method: 'GET' });
  return response.data as T;
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await axiosForBackend({ url, method: 'POST', data: body ?? {} });
  return response.data as T;
}

async function patchJson<T>(url: string, body: unknown): Promise<T> {
  const response = await axiosForBackend({ url, method: 'PATCH', data: body });
  return response.data as T;
}

async function deleteJson<T>(url: string): Promise<T> {
  const response = await axiosForBackend({ url, method: 'DELETE' });
  return response.data as T;
}

const buildQuery = (params: object): string => {
  const search: URLSearchParams = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(
    ([key, value]: [string, unknown]) => {
      if (value !== undefined && value !== null && value !== '') {
        search.set(key, String(value));
      }
    },
  );
  const query: string = search.toString();
  return query ? `?${query}` : '';
};

/* ============ 资产管理 ============ */

export async function fetchAssetList(
  params: AdminEnhanceListParams,
): Promise<AdminEnhanceListResponse<AdminAsset>> {
  return getJson<AdminEnhanceListResponse<AdminAsset>>(
    `${ASSETS_BASE}${buildQuery(params)}`,
  );
}

export async function fetchAssetStats(): Promise<AdminEnhanceAssetStats> {
  return getJson<AdminEnhanceAssetStats>(`${ASSETS_BASE}/stats`);
}

export async function createAsset(
  body: CreateAdminAssetDto,
): Promise<AdminAsset> {
  return postJson<AdminAsset>(ASSETS_BASE, body);
}

export async function updateAsset(
  id: number,
  body: UpdateAdminAssetDto,
): Promise<AdminAsset> {
  return patchJson<AdminAsset>(`${ASSETS_BASE}/${id}`, body);
}

export async function deleteAsset(id: number): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${ASSETS_BASE}/${id}`);
}

export async function batchDeleteAssets(
  ids: number[],
): Promise<{ deleted: number }> {
  const body: AdminEnhanceBatchIdsDto = { ids };
  return postJson<{ deleted: number }>(`${ASSETS_BASE}/batch-delete`, body);
}

export async function inventoryCheckAsset(id: number): Promise<AdminAsset> {
  return postJson<AdminAsset>(`${ASSETS_BASE}/${id}/inventory-check`);
}

/* ============ 库存管理 ============ */

export async function fetchInventoryItemList(
  params: AdminEnhanceListParams,
): Promise<AdminEnhanceListResponse<AdminInventoryItem>> {
  return getJson<AdminEnhanceListResponse<AdminInventoryItem>>(
    `${INVENTORY_BASE}${buildQuery(params)}`,
  );
}

export async function fetchInventoryStats(): Promise<AdminEnhanceInventoryStats> {
  return getJson<AdminEnhanceInventoryStats>(`${INVENTORY_BASE}/stats`);
}

export async function createInventoryItem(
  body: CreateAdminInventoryItemDto,
): Promise<AdminInventoryItem> {
  return postJson<AdminInventoryItem>(INVENTORY_BASE, body);
}

export async function updateInventoryItem(
  id: number,
  body: UpdateAdminInventoryItemDto,
): Promise<AdminInventoryItem> {
  return patchJson<AdminInventoryItem>(`${INVENTORY_BASE}/${id}`, body);
}

export async function deleteInventoryItem(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${INVENTORY_BASE}/${id}`);
}

export async function batchDeleteInventoryItems(
  ids: number[],
): Promise<{ deleted: number }> {
  const body: AdminEnhanceBatchIdsDto = { ids };
  return postJson<{ deleted: number }>(`${INVENTORY_BASE}/batch-delete`, body);
}
