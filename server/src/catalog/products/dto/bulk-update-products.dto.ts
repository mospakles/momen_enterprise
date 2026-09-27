import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';
import { UpdateProductDto } from './update-product.dto';

export class BulkUpdateProductsDto extends PartialType(UpdateProductDto) {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  ids!: string[];
}
