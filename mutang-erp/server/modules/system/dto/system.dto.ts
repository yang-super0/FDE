import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';

export interface AuthedRequest {
  userContext: { userId: string };
}

export class CreateSystemUserDto {
  @IsString()
  @IsNotEmpty()
  memberId!: string;

  @IsString()
  @IsNotEmpty()
  department!: string;

  @IsOptional()
  @Matches(/^\d+$/, { message: '角色 ID 必须是数字字符串' })
  roleId?: string;
}

export class UpdateSystemUserStatusDto {
  @IsIn(['enabled', 'disabled'])
  status!: 'enabled' | 'disabled';
}

export class UpdateSystemUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  department?: string;

  @IsOptional()
  @Matches(/^\d+$/, { message: '角色 ID 必须是数字字符串' })
  roleId?: string | null;
}

export class ConfigItemDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  configValue!: string;
}

export class UpdateSystemConfigsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ConfigItemDto)
  configs!: ConfigItemDto[];
}
