import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedAdminUser } from './admin-jwt.strategy';

@ApiTags('admin-auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly authService: AdminAuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  login(@Body() dto: AdminLoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(dto.refreshToken);
  }

  @Post('password-reset/request')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    // Deliberately does not distinguish "no such account" from "email sent" —
    // see AdminAuthService.requestPasswordReset. The Notifications module
    // sends the actual email once it exists.
    await this.authService.requestPasswordReset(dto.email);
  }

  @Post('password-reset/confirm')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Post('2fa/begin')
  @UseGuards(AdminJwtAuthGuard)
  beginTwoFactor(@CurrentUser() user: AuthenticatedAdminUser) {
    return this.authService.beginTwoFactorSetup(user.id);
  }

  @Post('2fa/confirm')
  @UseGuards(AdminJwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async confirmTwoFactor(
    @CurrentUser() user: AuthenticatedAdminUser,
    @Body('code') code: string,
  ) {
    await this.authService.confirmTwoFactorSetup(user.id, code);
  }

  @Post('2fa/disable')
  @UseGuards(AdminJwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async disableTwoFactor(@CurrentUser() user: AuthenticatedAdminUser) {
    await this.authService.disableTwoFactor(user.id);
  }
}
