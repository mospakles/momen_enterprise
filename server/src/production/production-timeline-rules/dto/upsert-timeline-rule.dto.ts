import { ApiProperty } from '@nestjs/swagger';
import { TimelineRuleScope } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsString,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpsertTimelineRuleDto {
  @ApiProperty({ enum: TimelineRuleScope })
  @IsEnum(TimelineRuleScope)
  scope!: TimelineRuleScope;

  // Required whenever scope isn't "global" — @ValidateIf skips validation
  // entirely (including "must be present") when scope IS global, so the two
  // states ("global" -> no scopeRef, everything else -> scopeRef required)
  // are both enforced without a separate @IsOptional().
  @ApiProperty({
    required: false,
    description:
      'Product slug / collection slug / Garment value / country name — omit iff scope is "global"',
  })
  @ValidateIf((o) => o.scope !== TimelineRuleScope.global)
  @IsString()
  @MinLength(1)
  scopeRef?: string;

  @ApiProperty() @IsInt() @Min(0) standardDaysMin!: number;
  @ApiProperty() @IsInt() @Min(0) standardDaysMax!: number;
  @ApiProperty() @IsInt() @Min(0) expressDaysMin!: number;
  @ApiProperty() @IsInt() @Min(0) expressDaysMax!: number;
}
