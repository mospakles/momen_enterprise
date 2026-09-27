import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GiftCardsService } from './gift-cards.service';
import { IssueGiftCardDto } from './dto/issue-gift-card.dto';
import { UpdateGiftCardStatusDto } from './dto/update-gift-card-status.dto';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('admin-gift-cards')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/gift-cards')
export class AdminGiftCardsController {
  constructor(private readonly service: GiftCardsService) {}

  @Get()
  @Permissions('promotions', 'view')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Permissions('promotions', 'view')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Permissions('promotions', 'create')
  issue(@Body() dto: IssueGiftCardDto) {
    return this.service.issue(dto);
  }

  @Patch(':id/status')
  @Permissions('promotions', 'edit')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateGiftCardStatusDto) {
    return this.service.updateStatus(id, dto.status);
  }
}
