import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/** The file itself arrives as a multipart field, not part of this DTO — see
 * `@UseInterceptors(FileInterceptor('file'))` on the controller method. This
 * covers the accompanying form fields. */
export class UploadMediaDto {
  @ApiProperty({ required: false, default: 'uncategorized' })
  @IsOptional()
  @IsString()
  folder?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  alt?: string;
}
