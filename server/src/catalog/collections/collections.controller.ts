import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CollectionsService } from './collections.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('storefront-collections')
@Public()
@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Get()
  findPublished() {
    return this.collectionsService.findPublished();
  }
}
