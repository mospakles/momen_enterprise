import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FaqsService } from './faqs.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('storefront-faqs')
@Public()
@Controller('faqs')
export class FaqsController {
  constructor(private readonly service: FaqsService) {}

  @Get()
  findPublished() {
    return this.service.findPublished();
  }
}
