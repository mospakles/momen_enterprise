import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateOrderProductionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  assignedStaffId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  expectedCompletionDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  actualCompletionDate?: string;
}
