import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PlatformService } from './platform.service';
import {
  CreateContactMessageDto,
  SubscribeNewsletterDto,
  UpdatePlatformSettingsDto,
} from './dto/platform.dto';
import { Public } from '../common/decorators/public.decorator';
import { AdminJwtAuthGuard } from '../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@ApiTags('platform')
@Controller()
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Public()
  @Get('settings/public')
  getPublicSettings() {
    return this.platform.getSettings();
  }

  @Public()
  @Post('newsletter/subscribe')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  subscribe(@Body() dto: SubscribeNewsletterDto) {
    return this.platform.subscribe(dto.email);
  }

  @Public()
  @Post('contact')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  contact(@Body() dto: CreateContactMessageDto) {
    return this.platform.createContactMessage(dto);
  }
}

@ApiTags('admin-platform')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin')
export class AdminPlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Get('settings')
  @Permissions('settings', 'view')
  settings() {
    return this.platform.getSettings();
  }

  @Put('settings')
  @Permissions('settings', 'edit')
  updateSettings(@Body() dto: UpdatePlatformSettingsDto) {
    return this.platform.updateSettings(dto.value);
  }

  @Get('newsletter-subscribers')
  @Permissions('content', 'view')
  subscribers() {
    return this.platform.listSubscribers();
  }

  @Get('contact-messages')
  @Permissions('customers', 'view')
  contactMessages() {
    return this.platform.listContactMessages();
  }

  @Get('system-health')
  @Permissions('settings', 'view')
  health() {
    return this.platform.health();
  }
}
