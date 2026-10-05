import { ApiProperty } from '@nestjs/swagger';
import { PermissionResource } from '@prisma/client';
import { Allow, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAuditLogDto {
  @ApiProperty() @IsString() @MaxLength(120) action!: string;
  @ApiProperty({ enum: PermissionResource, required: false })
  @IsOptional()
  @IsEnum(PermissionResource)
  resource?: PermissionResource;
  @ApiProperty({ required: false }) @IsOptional() @IsString() resourceId?: string;
  @ApiProperty() @IsString() @MaxLength(500) summary!: string;
  @ApiProperty({ required: false }) @IsOptional() @Allow() before?: unknown;
  @ApiProperty({ required: false }) @IsOptional() @Allow() after?: unknown;
  @ApiProperty({ required: false }) @IsOptional() @IsString() device?: string;
}
