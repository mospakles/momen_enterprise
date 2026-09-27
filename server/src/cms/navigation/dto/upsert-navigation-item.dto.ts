import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpsertNavigationItemDto {
  @ApiProperty() @IsString() @MinLength(1) label!: string;
  @ApiProperty() @IsString() href!: string;
  @ApiProperty({ default: 0 }) @IsInt() @Min(0) sortOrder!: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() parentId?: string;
}
