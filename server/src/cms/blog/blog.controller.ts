import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BlogService } from './blog.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('storefront-blog')
@Public()
@Controller('blog')
export class BlogController {
  constructor(private readonly service: BlogService) {}

  @Get()
  findPublished() {
    return this.service.findPublished();
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.service.findPublishedBySlug(slug);
  }
}
