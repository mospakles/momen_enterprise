import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Param,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerSignupDto } from './dto/signup.dto';
import { CustomerLoginDto } from './dto/login.dto';
import { CustomerRefreshTokenDto } from './dto/refresh-token.dto';
import {
  RequestCustomerPasswordResetDto,
  ResetCustomerPasswordDto,
} from './dto/password-reset.dto';
import { UpdateCustomerProfileDto } from './dto/update-profile.dto';
import { CustomerJwtAuthGuard } from '../../common/guards/customer-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedCustomer } from './customer-jwt.strategy';
import { ChangeCustomerPasswordDto } from './dto/change-password.dto';
import {
  CreateCustomerAddressDto,
  UpdateCustomerAddressDto,
} from './dto/address.dto';
import {
  accessCookieName,
  authCookieOptions,
  readCookie,
  refreshCookieName,
} from '../../common/auth-cookies';

@ApiTags('customer-auth')
@Controller('auth')
export class CustomerAuthController {
  constructor(
    private readonly authService: CustomerAuthService,
    private readonly config: ConfigService,
  ) {}

  private setSession(response: Response, pair: { accessToken: string; refreshToken: string }) {
    response.cookie(
      accessCookieName('customer'),
      pair.accessToken,
      authCookieOptions(this.config, 'access'),
    );
    response.cookie(
      refreshCookieName('customer'),
      pair.refreshToken,
      authCookieOptions(this.config, 'refresh'),
    );
  }

  @Post('signup')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async signup(
    @Body() dto: CustomerSignupDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.setSession(response, await this.authService.signup(dto));
    return { ok: true };
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(
    @Body() dto: CustomerLoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.setSession(response, await this.authService.login(dto.email, dto.password));
    return { ok: true };
  }

  @Post('refresh')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async refresh(
    @Body() dto: CustomerRefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token =
      dto.refreshToken ??
      readCookie(request, refreshCookieName('customer'));
    if (!token) throw new UnauthorizedException('No refresh session');
    this.setSession(response, await this.authService.refresh(token));
    return { ok: true };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Body() dto: CustomerRefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = dto.refreshToken ?? readCookie(request, refreshCookieName('customer'));
    if (token) await this.authService.logout(token);
    response.clearCookie(accessCookieName('customer'), authCookieOptions(this.config, 'access'));
    response.clearCookie(refreshCookieName('customer'), authCookieOptions(this.config, 'refresh'));
  }

  @Post('password-reset/request')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async requestPasswordReset(@Body() dto: RequestCustomerPasswordResetDto) {
    await this.authService.requestPasswordReset(dto.email);
  }

  @Post('password-reset/confirm')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() dto: ResetCustomerPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Get('me')
  @UseGuards(CustomerJwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedCustomer) {
    return this.authService.getProfile(user.id);
  }

  @Patch('me')
  @UseGuards(CustomerJwtAuthGuard)
  updateProfile(
    @CurrentUser() user: AuthenticatedCustomer,
    @Body() dto: UpdateCustomerProfileDto,
  ) {
    return this.authService.updateProfile(user.id, dto);
  }

  @Post('change-password')
  @UseGuards(CustomerJwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() user: AuthenticatedCustomer,
    @Body() dto: ChangeCustomerPasswordDto,
  ) {
    await this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Post('addresses')
  @UseGuards(CustomerJwtAuthGuard)
  addAddress(
    @CurrentUser() user: AuthenticatedCustomer,
    @Body() dto: CreateCustomerAddressDto,
  ) {
    return this.authService.addAddress(user.id, dto);
  }

  @Patch('addresses/:id')
  @UseGuards(CustomerJwtAuthGuard)
  updateAddress(
    @CurrentUser() user: AuthenticatedCustomer,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerAddressDto,
  ) {
    return this.authService.updateAddress(user.id, id, dto);
  }

  @Delete('addresses/:id')
  @UseGuards(CustomerJwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAddress(
    @CurrentUser() user: AuthenticatedCustomer,
    @Param('id') id: string,
  ) {
    await this.authService.removeAddress(user.id, id);
  }
}
