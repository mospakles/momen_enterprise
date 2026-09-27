import { ApiProperty } from '@nestjs/swagger';
import { CustomizationApprovalStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateCustomizationStatusDto {
  @ApiProperty({ enum: CustomizationApprovalStatus })
  @IsEnum(CustomizationApprovalStatus)
  status!: CustomizationApprovalStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
