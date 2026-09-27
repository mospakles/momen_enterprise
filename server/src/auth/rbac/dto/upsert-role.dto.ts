import { ApiProperty } from '@nestjs/swagger';
import { PermissionAction, PermissionResource } from '@prisma/client';
import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class UpsertRoleDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  // Only shape-checked here; RolesService validates each resource/action
  // against the Prisma enums (and Postgres re-validates at insert) when it
  // flattens this into RolePermission rows.
  @ApiProperty({
    description: 'Map of PermissionResource -> PermissionAction[]',
    example: { products: ['view', 'edit'], orders: ['view'] },
  })
  @IsObject()
  permissions!: Partial<Record<PermissionResource, PermissionAction[]>>;
}
