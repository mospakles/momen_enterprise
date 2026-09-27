import { ApiProperty } from '@nestjs/swagger';
import { GiftCardStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateGiftCardStatusDto {
  @ApiProperty({ enum: GiftCardStatus })
  @IsEnum(GiftCardStatus)
  status!: GiftCardStatus;
}
