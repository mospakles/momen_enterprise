import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdminQueryProductsDto } from './dto/admin-query-products.dto';
import { BulkUpdateProductsDto } from './dto/bulk-update-products.dto';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedAdminUser } from '../../auth/admin-auth/admin-jwt.strategy';

@ApiTags('admin-products')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/products')
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Permissions('products', 'view')
  findAll(@Query() query: AdminQueryProductsDto) {
    return this.productsService.findAllAdmin(query);
  }

  @Get(':id')
  @Permissions('products', 'view')
  findOne(@Param('id') id: string) {
    return this.productsService.findOneAdmin(id);
  }

  @Post()
  @Permissions('products', 'create')
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch('bulk')
  @Permissions('products', 'edit')
  bulkUpdate(@Body() dto: BulkUpdateProductsDto) {
    return this.productsService.bulkUpdate(dto);
  }

  @Patch(':id')
  @Permissions('products', 'edit')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthenticatedAdminUser,
  ) {
    return this.productsService.update(id, dto, {
      id: user.id,
      name: user.name,
    });
  }

  @Delete(':id')
  @Permissions('products', 'delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedAdminUser) {
    return this.productsService.remove(id, { id: user.id, name: user.name });
  }
}
