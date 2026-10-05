import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
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
import {
  accessCookieName,
  authCookieOptions,
  readCookie,
  refreshCookieName,
} from '../../common/auth-cookies';

@ApiTags('admin-auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly authService: AdminAuthService,
    private readonly config: ConfigService,
  ) {}

  private setSession(response: Response, pair: { accessToken: string; refreshToken: string }) {
    response.cookie(
      accessCookieName('admin'),
      pair.accessToken,
      authCookieOptions(this.config, 'access'),
    );
    response.cookie(
      refreshCookieName('admin'),
      pair.refreshToken,
      authCookieOptions(this.config, 'refresh'),
    );
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body() dto: AdminLoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.setSession(response, await this.authService.login(dto));
    return { ok: true };
  }

  @Post('refresh')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = dto.refreshToken ?? readCookie(request, refreshCookieName('admin'));
    if (!token) throw new UnauthorizedException('No refresh session');
    this.setSession(response, await this.authService.refresh(token));
    return { ok: true };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Body() dto: RefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = dto.refreshToken ?? readCookie(request, refreshCookieName('admin'));
    if (token) await this.authService.logout(token);
    response.clearCookie(accessCookieName('admin'), authCookieOptions(this.config, 'access'));
    response.clearCookie(refreshCookieName('admin'), authCookieOptions(this.config, 'refresh'));
  }

  @Get('me')
  @UseGuards(AdminJwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedAdminUser) {
    return this.authService.getProfile(user.id);
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
