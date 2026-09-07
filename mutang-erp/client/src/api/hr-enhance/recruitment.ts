import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  CreateHrCheckinBody,
  CreateHrInterviewBody,
  CreateHrInvitationBody,
  CreateHrRecruitmentPlanBody,
  CreateHrResumeBody,
  HrBatchStatusBody,
  HrCheckin,
  HrCheckinListParams,
  HrCheckinPage,
  HrCheckinStats,
  HrInterview,
  HrInterviewEvaluateBody,
  HrInterviewListParams,
  HrInterviewOfferBody,
  HrInterviewPage,
  HrInvitation,
  HrInvitationListParams,
  HrInvitationPage,
  HrPlanDepartmentStat,
  HrPlanStatusBody,
  HrRecruitmentPlan,
  HrRecruitmentPlanListParams,
  HrRecruitmentPlanPage,
  HrResume,
  HrResumeListParams,
  HrResumePage,
  HrResumeRatingBody,
  UpdateHrCheckinBody,
  UpdateHrInterviewBody,
  UpdateHrInvitationBody,
  UpdateHrRecruitmentPlanBody,
  UpdateHrResumeBody,
} from '@shared/api.interface';

const BASE: string = '/api/hr-enhance';

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

/* ============ 简历管理 ============ */

export async function fetchResumeList(
  params: HrResumeListParams,
): Promise<HrResumePage> {
  return getJson<HrResumePage>(`${BASE}/resumes${buildQuery(params)}`);
}

export async function fetchResumeDetail(id: number): Promise<HrResume> {
  return getJson<HrResume>(`${BASE}/resumes/${id}`);
}

export async function createResume(
  body: CreateHrResumeBody,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}/resumes`, body);
}

export async function updateResume(
  id: number,
  body: UpdateHrResumeBody,
): Promise<void> {
  await patchJson<void>(`${BASE}/resumes/${id}`, body);
}

export async function deleteResume(id: number): Promise<void> {
  await deleteJson<void>(`${BASE}/resumes/${id}`);
}

export async function setResumeRatingAction(
  id: number,
  body: HrResumeRatingBody,
): Promise<void> {
  await postJson<void>(`${BASE}/resumes/${id}/rating`, body);
}

export async function batchResumeStatusAction(
  body: HrBatchStatusBody,
): Promise<{ updated: number }> {
  return postJson<{ updated: number }>(`${BASE}/resumes/batch-status`, body);
}

/* ============ 面试邀约 ============ */

export async function fetchInvitationList(
  params: HrInvitationListParams,
): Promise<HrInvitationPage> {
  return getJson<HrInvitationPage>(`${BASE}/invitations${buildQuery(params)}`);
}

export async function createInvitation(
  body: CreateHrInvitationBody,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}/invitations`, body);
}

export async function updateInvitation(
  id: number,
  body: UpdateHrInvitationBody,
): Promise<void> {
  await patchJson<void>(`${BASE}/invitations/${id}`, body);
}

export async function deleteInvitation(id: number): Promise<void> {
  await deleteJson<void>(`${BASE}/invitations/${id}`);
}

export async function updateInvitationStatusAction(
  id: number,
  body: HrPlanStatusBody,
): Promise<void> {
  await postJson<void>(`${BASE}/invitations/${id}/status`, body);
}

export async function batchInvitationStatusAction(
  body: HrBatchStatusBody,
): Promise<{ updated: number }> {
  return postJson<{ updated: number }>(`${BASE}/invitations/batch-status`, body);
}

/* ============ 面试记录 ============ */

export async function fetchInterviewList(
  params: HrInterviewListParams,
): Promise<HrInterviewPage> {
  return getJson<HrInterviewPage>(`${BASE}/interviews${buildQuery(params)}`);
}

export async function createInterview(
  body: CreateHrInterviewBody,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}/interviews`, body);
}

export async function updateInterview(
  id: number,
  body: UpdateHrInterviewBody,
): Promise<void> {
  await patchJson<void>(`${BASE}/interviews/${id}`, body);
}

export async function deleteInterview(id: number): Promise<void> {
  await deleteJson<void>(`${BASE}/interviews/${id}`);
}

export async function evaluateInterviewAction(
  id: number,
  body: HrInterviewEvaluateBody,
): Promise<void> {
  await postJson<void>(`${BASE}/interviews/${id}/evaluate`, body);
}

export async function setInterviewOfferAction(
  id: number,
  body: HrInterviewOfferBody,
): Promise<void> {
  await postJson<void>(`${BASE}/interviews/${id}/offer`, body);
}

/* ============ 签到管理 ============ */

export async function fetchCheckinList(
  params: HrCheckinListParams,
): Promise<HrCheckinPage> {
  return getJson<HrCheckinPage>(`${BASE}/checkins${buildQuery(params)}`);
}

export async function createCheckin(
  body: CreateHrCheckinBody,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}/checkins`, body);
}

export async function updateCheckin(
  id: number,
  body: UpdateHrCheckinBody,
): Promise<void> {
  await patchJson<void>(`${BASE}/checkins/${id}`, body);
}

export async function deleteCheckin(id: number): Promise<void> {
  await deleteJson<void>(`${BASE}/checkins/${id}`);
}

export async function doCheckinAction(
  id: number,
  location?: string,
): Promise<void> {
  await postJson<void>(
    `${BASE}/checkins/${id}/checkin`,
    location ? { location } : {},
  );
}

export async function fetchCheckinStats(): Promise<HrCheckinStats> {
  return getJson<HrCheckinStats>(`${BASE}/checkins/stats`);
}

/* ============ 招聘计划 ============ */

export async function fetchRecruitmentPlanList(
  params: HrRecruitmentPlanListParams,
): Promise<HrRecruitmentPlanPage> {
  return getJson<HrRecruitmentPlanPage>(
    `${BASE}/recruitment-plans${buildQuery(params)}`,
  );
}

export async function createRecruitmentPlan(
  body: CreateHrRecruitmentPlanBody,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}/recruitment-plans`, body);
}

export async function updateRecruitmentPlan(
  id: number,
  body: UpdateHrRecruitmentPlanBody,
): Promise<void> {
  await patchJson<void>(`${BASE}/recruitment-plans/${id}`, body);
}

export async function deleteRecruitmentPlan(id: number): Promise<void> {
  await deleteJson<void>(`${BASE}/recruitment-plans/${id}`);
}

export async function updatePlanStatusAction(
  id: number,
  body: HrPlanStatusBody,
): Promise<void> {
  await postJson<void>(`${BASE}/recruitment-plans/${id}/status`, body);
}

export async function fetchPlanDepartmentStats(): Promise<HrPlanDepartmentStat[]> {
  return getJson<HrPlanDepartmentStat[]>(
    `${BASE}/recruitment-plans/department-stats`,
  );
}
