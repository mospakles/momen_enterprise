import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CartService, type StoredCartLine } from './cart.service';
import { CustomerJwtAuthGuard } from '../common/guards/customer-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedCustomer } from '../auth/customer-auth/customer-jwt.strategy';

class ReplaceCartDto {
  @ApiProperty({ type: [Object] })
  @IsArray()
  items!: StoredCartLine[];
}

@ApiTags('cart')
@ApiBearerAuth()
@UseGuards(CustomerJwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedCustomer) {
    return this.cart.get(user.id);
  }

  @Put()
  replace(@CurrentUser() user: AuthenticatedCustomer, @Body() dto: ReplaceCartDto) {
    return this.cart.replace(user.id, dto.items);
  }
}
