import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NavigationService } from './navigation.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('storefront-navigation')
@Public()
@Controller('navigation')
export class NavigationController {
  constructor(private readonly service: NavigationService) {}

  @Get()
  findTree() {
    return this.service.findTree();
  }
}
