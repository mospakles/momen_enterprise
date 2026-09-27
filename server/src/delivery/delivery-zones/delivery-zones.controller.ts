import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DeliveryZonesService } from './delivery-zones.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('storefront-delivery')
@Public()
@Controller('delivery-zones')
export class DeliveryZonesController {
  constructor(private readonly service: DeliveryZonesService) {}

  @Get()
  findActive() {
    return this.service.findActive();
  }
}
