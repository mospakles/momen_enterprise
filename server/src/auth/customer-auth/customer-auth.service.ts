import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { generateOpaqueToken, hashToken } from '../../common/utils/token.util';
import type { CustomerSignupDto } from './dto/signup.dto';
import type { SocialLoginDto } from './dto/social-login.dto';
import type {
  CreateCustomerAddressDto,
  UpdateCustomerAddressDto,
} from './dto/address.dto';
import { EmailSenderService } from '../../notifications/email-sender.service';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
    private readonly emailSender: EmailSenderService,
  ) {}

  private async issueTokenPair(customerId: string): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync(
      { sub: customerId, type: 'customer' },
      {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_TTL') ?? '15m',
      },
    );

    const refreshToken = generateOpaqueToken();
    await this.prisma.customerRefreshToken.create({
      data: {
        customerId,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  async signup(dto: CustomerSignupDto): Promise<TokenPair> {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.customer.findUnique({
      where: { email },
    });
    if (existing)
      throw new ConflictException('An account with that email already exists');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const customer = await this.prisma.customer.create({
      data: {
        name: dto.name.trim(),
        email,
        phone: dto.phone,
        passwordHash,
        marketingOptIn: true,
        lastLoginAt: new Date(),
      },
    });

    this.events.emit('customer.created', {
      customerEmail: customer.email,
      customerName: customer.name,
    });
    return this.issueTokenPair(customer.id);
  }

  async login(email: string, password: string): Promise<TokenPair> {
    const customer = await this.prisma.customer.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!customer || !customer.passwordHash)
      throw new UnauthorizedException('Invalid credentials');
    if (customer.status === 'disabled')
      throw new ForbiddenException('This account has been disabled');

    const passwordOk = await bcrypt.compare(password, customer.passwordHash);
    if (!passwordOk) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { lastLoginAt: new Date() },
    });
    return this.issueTokenPair(customer.id);
  }

  /** See SocialLoginDto's doc comment — `dto` must already be a verified
   * provider profile by the time it reaches here. */
  async socialLogin(dto: SocialLoginDto): Promise<TokenPair> {
    const existingLink = await this.prisma.customerSocialAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: dto.provider,
          providerAccountId: dto.providerAccountId,
        },
      },
    });
    if (existingLink) {
      await this.prisma.customer.update({
        where: { id: existingLink.customerId },
        data: { lastLoginAt: new Date() },
      });
      return this.issueTokenPair(existingLink.customerId);
    }

    const email = dto.email.toLowerCase();
    const existingCustomer = await this.prisma.customer.findUnique({
      where: { email },
    });
    const customer =
      existingCustomer ??
      (await this.prisma.customer.create({
        data: {
          name: dto.name,
          email,
          marketingOptIn: true,
          lastLoginAt: new Date(),
        },
      }));

    if (!existingCustomer) {
      this.events.emit('customer.created', {
        customerEmail: customer.email,
        customerName: customer.name,
      });
    }

    await this.prisma.customerSocialAccount.create({
      data: {
        customerId: customer.id,
        provider: dto.provider,
        providerAccountId: dto.providerAccountId,
      },
    });

    return this.issueTokenPair(customer.id);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const tokenHash = hashToken(refreshToken);
    const stored = await this.prisma.customerRefreshToken.findUnique({
      where: { tokenHash },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    await this.prisma.customerRefreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokenPair(stored.customerId);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.customerRefreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async requestPasswordReset(email: string): Promise<void> {
    const customer = await this.prisma.customer.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!customer || !customer.passwordHash) return; // no account, or social-only — nothing to reset

    const token = generateOpaqueToken();
    await this.prisma.customerPasswordReset.create({
      data: {
        customerId: customer.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    const frontendUrl = this.config.get('FRONTEND_URL') ?? 'http://localhost:3000';
    await this.emailSender.send(
      customer.email,
      'Reset your Momen password',
      `Use this secure link within one hour to reset your password: ${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`,
    );
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const stored = await this.prisma.customerPasswordReset.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { id: stored.customerId },
        data: { passwordHash },
      }),
      this.prisma.customerPasswordReset.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.customerRefreshToken.updateMany({
        where: { customerId: stored.customerId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async updateProfile(
    customerId: string,
    patch: { name?: string; email?: string; phone?: string },
  ) {
    if (patch.email) {
      const clash = await this.prisma.customer.findUnique({
        where: { email: patch.email.toLowerCase() },
      });
      if (clash && clash.id !== customerId)
        throw new ConflictException('Email already in use');
      patch.email = patch.email.toLowerCase();
    }
    await this.prisma.customer.update({
      where: { id: customerId },
      data: patch,
    });
    return this.getProfile(customerId);
  }

  async getProfile(customerId: string) {
    const customer = await this.prisma.customer.findUniqueOrThrow({
      where: { id: customerId },
      include: { addresses: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] } },
    });
    const { passwordHash: _passwordHash, ...safe } = customer;
    return { ...safe, notes: [], avatar: undefined };
  }

  async changePassword(
    customerId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const customer = await this.prisma.customer.findUniqueOrThrow({
      where: { id: customerId },
    });
    if (
      !customer.passwordHash ||
      !(await bcrypt.compare(currentPassword, customer.passwordHash))
    ) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { id: customerId },
        data: { passwordHash },
      }),
      this.prisma.customerRefreshToken.updateMany({
        where: { customerId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async addAddress(customerId: string, dto: CreateCustomerAddressDto) {
    return this.prisma.$transaction(async (tx) => {
      const count = await tx.customerAddress.count({ where: { customerId } });
      const makeDefault = dto.isDefault || count === 0;
      if (makeDefault) {
        await tx.customerAddress.updateMany({
          where: { customerId },
          data: { isDefault: false },
        });
      }
      return tx.customerAddress.create({
        data: { ...dto, isDefault: makeDefault, customerId },
      });
    });
  }

  async updateAddress(
    customerId: string,
    id: string,
    dto: UpdateCustomerAddressDto,
  ) {
    const owned = await this.prisma.customerAddress.findFirst({
      where: { id, customerId },
    });
    if (!owned) throw new ForbiddenException('Address not found');
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.customerAddress.updateMany({
          where: { customerId, id: { not: id } },
          data: { isDefault: false },
        });
      }
      return tx.customerAddress.update({ where: { id }, data: dto });
    });
  }

  async removeAddress(customerId: string, id: string): Promise<void> {
    const owned = await this.prisma.customerAddress.findFirst({
      where: { id, customerId },
    });
    if (!owned) throw new ForbiddenException('Address not found');
    await this.prisma.customerAddress.delete({ where: { id } });
    if (owned.isDefault) {
      const replacement = await this.prisma.customerAddress.findFirst({
        where: { customerId },
        orderBy: { createdAt: 'asc' },
      });
      if (replacement) {
        await this.prisma.customerAddress.update({
          where: { id: replacement.id },
          data: { isDefault: true },
        });
      }
    }
  }
}
