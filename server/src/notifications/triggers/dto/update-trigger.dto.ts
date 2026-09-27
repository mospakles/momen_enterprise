import { ApiProperty } from '@nestjs/swagger';
import { NotificationChannel } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

/** Triggers themselves are seeded (one per `NotificationEvent`) — admins
 * configure which channels fire and which template to use, not create new
 * ones freeform. */
export class UpdateTriggerDto {
  @ApiProperty({ enum: NotificationChannel, isArray: true })
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels!: NotificationChannel[];

  @ApiProperty() @IsBoolean() enabled!: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  emailTemplateId?: string;
}
