import { ApiProperty } from '@nestjs/swagger';
import { PaymentProvider } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpsertProviderConfigDto {
  @ApiProperty({ enum: PaymentProvider })
  provider!: PaymentProvider;

  @ApiProperty() @IsBoolean() enabled!: boolean;

  @ApiProperty({ enum: ['test', 'live'] })
  @IsIn(['test', 'live'])
  mode!: 'test' | 'live';

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  currencies!: string[];

  // Keys are optional on update — omitting them leaves the stored value
  // untouched, since the read side never echoes the real value back for the
  // admin to accidentally resubmit truncated/masked.
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  publicKey?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  secretKey?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  webhookUrl?: string;
}
