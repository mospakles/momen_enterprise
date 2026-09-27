import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BannersService } from './banners.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('storefront-banners')
@Public()
@Controller('banners')
export class BannersController {
  constructor(private readonly service: BannersService) {}

  @Get()
  findActive(@Query('placement') placement?: string) {
    return this.service.findActive(placement);
  }
}
