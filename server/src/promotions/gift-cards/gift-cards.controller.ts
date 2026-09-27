import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GiftCardsService } from './gift-cards.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('storefront-gift-cards')
@Public()
@Controller('gift-cards')
export class GiftCardsController {
  constructor(private readonly service: GiftCardsService) {}

  @Get(':code/balance')
  checkBalance(@Param('code') code: string) {
    return this.service.checkBalance(code);
  }
}
