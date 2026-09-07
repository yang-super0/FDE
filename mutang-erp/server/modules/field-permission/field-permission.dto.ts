import type {
  FieldPermissionBatchDto,
  FieldPermissionUpsertDto,
} from '@shared/api.interface';

export class FieldPermissionUpsertBody implements FieldPermissionUpsertDto {
  roleId!: number;
  module!: string;
  fieldName!: string;
  fieldLabel!: string;
  visible!: boolean;
  editable!: boolean;
  masked!: boolean;
  remark?: string;
}

export class FieldPermissionBatchBody implements FieldPermissionBatchDto {
  items!: FieldPermissionUpsertDto[];
}

/** PATCH 仅允许更新 visible/editable/masked/remark */
export class UpdateFieldPermissionBody {
  visible?: boolean;
  editable?: boolean;
  masked?: boolean;
  remark?: string;
}
