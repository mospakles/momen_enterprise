import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerSignupDto } from './dto/signup.dto';
import { CustomerLoginDto } from './dto/login.dto';
import { SocialLoginDto } from './dto/social-login.dto';
import { CustomerRefreshTokenDto } from './dto/refresh-token.dto';
import {
  RequestCustomerPasswordResetDto,
  ResetCustomerPasswordDto,
} from './dto/password-reset.dto';
import { UpdateCustomerProfileDto } from './dto/update-profile.dto';
import { CustomerJwtAuthGuard } from '../../common/guards/customer-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedCustomer } from './customer-jwt.strategy';

@ApiTags('customer-auth')
@Controller('auth')
export class CustomerAuthController {
  constructor(private readonly authService: CustomerAuthService) {}

  @Post('signup')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  signup(@Body() dto: CustomerSignupDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() dto: CustomerLoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('social-login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  socialLogin(@Body() dto: SocialLoginDto) {
    return this.authService.socialLogin(dto);
  }

  @Post('refresh')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  refresh(@Body() dto: CustomerRefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: CustomerRefreshTokenDto) {
    await this.authService.logout(dto.refreshToken);
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
    return user;
  }

  @Patch('me')
  @UseGuards(CustomerJwtAuthGuard)
  updateProfile(
    @CurrentUser() user: AuthenticatedCustomer,
    @Body() dto: UpdateCustomerProfileDto,
  ) {
    return this.authService.updateProfile(user.id, dto);
  }
}
