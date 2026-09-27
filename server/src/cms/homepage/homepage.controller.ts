import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HomepageService } from './homepage.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('storefront-homepage')
@Public()
@Controller('homepage-sections')
export class HomepageController {
  constructor(private readonly service: HomepageService) {}

  @Get()
  findVisible() {
    return this.service.findVisible();
  }
}
