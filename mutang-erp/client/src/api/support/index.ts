import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  KnowledgeDoc,
  KnowledgeDocDetail,
  PageResult,
  Ticket,
  TicketSummary,
} from '@shared/api.interface';

export interface TicketListParams {
  status?: string;
  page: number;
  pageSize: number;
}

export interface CreateTicketPayload {
  category: string;
  title: string;
  description: string;
}

export interface UpdateTicketPayload {
  status: 'processing' | 'resolved';
  resolution?: string;
}

export interface KnowledgeDocListParams {
  category?: string;
  keyword?: string;
}

export async function getTicketSummary(): Promise<TicketSummary> {
  const res = await axiosForBackend.get<TicketSummary>(
    '/api/tickets/summary',
  );
  return res.data;
}

export async function getTicketList(
  params: TicketListParams,
): Promise<PageResult<Ticket>> {
  const res = await axiosForBackend.get<PageResult<Ticket>>('/api/tickets', {
    params,
  });
  return res.data;
}

export async function createTicket(
  payload: CreateTicketPayload,
): Promise<{ id: string }> {
  const res = await axiosForBackend.post<{ id: string }>(
    '/api/tickets',
    payload,
  );
  return res.data;
}

export async function updateTicket(
  id: string,
  payload: UpdateTicketPayload,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.patch<{ success: boolean }>(
    `/api/tickets/${id}`,
    payload,
  );
  return res.data;
}

export async function getKnowledgeDocs(
  params: KnowledgeDocListParams,
): Promise<{ items: KnowledgeDoc[] }> {
  const res = await axiosForBackend.get<{ items: KnowledgeDoc[] }>(
    '/api/knowledge-docs',
    { params },
  );
  return res.data;
}

export async function getKnowledgeDocDetail(
  id: string,
): Promise<KnowledgeDocDetail> {
  const res = await axiosForBackend.get<KnowledgeDocDetail>(
    `/api/knowledge-docs/${id}`,
  );
  return res.data;
}
