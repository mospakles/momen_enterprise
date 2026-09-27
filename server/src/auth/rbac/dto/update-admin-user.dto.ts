import { ApiProperty } from '@nestjs/swagger';
import { AdminUserStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateAdminUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  roleId?: string;

  @ApiProperty({ required: false, enum: AdminUserStatus })
  @IsOptional()
  @IsEnum(AdminUserStatus)
  status?: AdminUserStatus;
}
