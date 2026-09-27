import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PagesService } from './pages.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('storefront-pages')
@Public()
@Controller('pages')
export class PagesController {
  constructor(private readonly service: PagesService) {}

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.service.findPublishedBySlug(slug);
  }
}
