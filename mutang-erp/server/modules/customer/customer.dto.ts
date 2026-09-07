import { BadRequestException } from '@nestjs/common';
import type {
  CustomerStatus,
  OpportunityStage,
} from '@shared/api.interface';

export interface UserContextRequest {
  userContext: { userId: string };
}

export interface CustomerPayload {
  name: string;
  industry: string;
  contactName: string;
  contactPhone: string;
  source: string;
  status: CustomerStatus;
}

export type CustomerPatch = Partial<CustomerPayload>;

export interface FollowRecordPayload {
  method: string;
  content: string;
  nextFollowAt?: string;
}

export interface OpportunityPayload {
  name: string;
  customerId: string;
  stage: OpportunityStage;
  amount: number;
  expectedCloseAt?: string;
}

export const CUSTOMER_STATUSES: CustomerStatus[] = [
  'potential',
  'active',
  'churned',
];

export const OPPORTUNITY_STAGES: OpportunityStage[] = [
  'contact',
  'requirement',
  'quotation',
  'closed',
];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export function isCustomerStatus(value: unknown): value is CustomerStatus {
  return (
    typeof value === 'string' &&
    CUSTOMER_STATUSES.includes(value as CustomerStatus)
  );
}

export function isOpportunityStage(
  value: unknown,
): value is OpportunityStage {
  return (
    typeof value === 'string' &&
    OPPORTUNITY_STAGES.includes(value as OpportunityStage)
  );
}

export function requireText(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(`${label}不能为空`);
  }
  return value.trim();
}

export function requireUuid(value: unknown, label: string): string {
  const text: string = requireText(value, label);
  if (!UUID_PATTERN.test(text)) {
    throw new BadRequestException(`${label}格式无效`);
  }
  return text;
}

function requireDateText(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(`${label}格式无效`);
  }
  if (Number.isNaN(new Date(value).getTime())) {
    throw new BadRequestException(`${label}格式无效`);
  }
  return value;
}

export function validateCustomerPayload(
  body: Record<string, unknown>,
): CustomerPayload {
  const name: string = requireText(body.name, '客户名称');
  const industry: string = requireText(body.industry, '行业');
  const contactName: string = requireText(body.contactName, '联系人');
  const contactPhone: string = requireText(body.contactPhone, '联系电话');
  const source: string = requireText(body.source, '客户来源');
  if (!isCustomerStatus(body.status)) {
    throw new BadRequestException('客户状态无效');
  }
  return { name, industry, contactName, contactPhone, source, status: body.status };
}

export function validateCustomerPatch(
  body: Record<string, unknown>,
): CustomerPatch {
  const patch: CustomerPatch = {};
  if (body.name !== undefined) patch.name = requireText(body.name, '客户名称');
  if (body.industry !== undefined) {
    patch.industry = requireText(body.industry, '行业');
  }
  if (body.contactName !== undefined) {
    patch.contactName = requireText(body.contactName, '联系人');
  }
  if (body.contactPhone !== undefined) {
    patch.contactPhone = requireText(body.contactPhone, '联系电话');
  }
  if (body.source !== undefined) {
    patch.source = requireText(body.source, '客户来源');
  }
  if (body.status !== undefined) {
    if (!isCustomerStatus(body.status)) {
      throw new BadRequestException('客户状态无效');
    }
    patch.status = body.status;
  }
  if (Object.keys(patch).length === 0) {
    throw new BadRequestException('未提供可更新字段');
  }
  return patch;
}

export function validateFollowRecordPayload(
  body: Record<string, unknown>,
): FollowRecordPayload {
  const method: string = requireText(body.method, '跟进方式');
  const content: string = requireText(body.content, '跟进内容');
  let nextFollowAt: string | undefined;
  if (body.nextFollowAt !== undefined && body.nextFollowAt !== '') {
    nextFollowAt = requireDateText(body.nextFollowAt, '下次跟进时间');
  }
  return { method, content, nextFollowAt };
}

export function validateOpportunityPayload(
  body: Record<string, unknown>,
): OpportunityPayload {
  const name: string = requireText(body.name, '商机名称');
  const customerId: string = requireUuid(body.customerId, '客户');
  if (!isOpportunityStage(body.stage)) {
    throw new BadRequestException('商机阶段无效');
  }
  const amount: number = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new BadRequestException('商机金额无效');
  }
  let expectedCloseAt: string | undefined;
  if (body.expectedCloseAt !== undefined && body.expectedCloseAt !== '') {
    expectedCloseAt = requireDateText(body.expectedCloseAt, '预计成交时间');
  }
  return { name, customerId, stage: body.stage, amount, expectedCloseAt };
}
