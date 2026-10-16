import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { generateOpaqueToken, hashToken } from '../../common/utils/token.util';
import {
  generateBase32Secret,
  totpUri,
  verifyTotp,
} from '../../common/utils/totp.util';
import type { AdminLoginDto } from './dto/login.dto';
import { EmailSenderService } from '../../notifications/email-sender.service';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly emailSender: EmailSenderService,
  ) {}

  private async issueTokenPair(adminUserId: string): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync(
      { sub: adminUserId, type: 'admin' },
      {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_TTL') ?? '15m',
      },
    );

    const refreshToken = generateOpaqueToken();
    const refreshTtlDays = 30;
    await this.prisma.adminRefreshToken.create({
      data: {
        adminUserId,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  async login(dto: AdminLoginDto): Promise<TokenPair> {
    const user = await this.prisma.adminUser.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (user.status === 'disabled')
      throw new ForbiddenException('This admin account has been disabled');

    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) throw new UnauthorizedException('Invalid credentials');

    if (user.twoFactorEnabled) {
      if (!dto.twoFactorCode)
        throw new UnauthorizedException('Two-factor code required');
      if (
        !user.twoFactorSecret ||
        !verifyTotp(user.twoFactorSecret, dto.twoFactorCode)
      ) {
        throw new UnauthorizedException('Invalid two-factor code');
      }
    }

    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        status: user.status === 'invited' ? 'active' : user.status,
      },
    });

    return this.issueTokenPair(user.id);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const tokenHash = hashToken(refreshToken);
    const stored = await this.prisma.adminRefreshToken.findUnique({
      where: { tokenHash },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Rotate: revoke the used token, issue a fresh pair.
    await this.prisma.adminRefreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokenPair(stored.adminUserId);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await this.prisma.adminRefreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async requestPasswordReset(email: string): Promise<{ token: string } | null> {
    const user = await this.prisma.adminUser.findUnique({
      where: { email: email.toLowerCase() },
    });
    // Always behave the same whether or not the account exists, to avoid
    // leaking which emails are registered. The caller (controller) discards
    // the token in that case — email delivery happens in the Notifications
    // module once it exists; for now the token is surfaced to the caller so
    // password reset is testable end-to-end without email wired up yet.
    if (!user) return null;

    const token = generateOpaqueToken();
    await this.prisma.adminPasswordReset.create({
      data: {
        adminUserId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    const frontendUrl = this.config.get('FRONTEND_URL') ?? 'http://localhost:3000';
    await this.emailSender.send(
      user.email,
      'Reset your Momen admin password',
      `Use this secure link within one hour to reset your password: ${frontendUrl}/admin/reset-password?token=${encodeURIComponent(token)}`,
    );
    return { token };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(token);
    const stored = await this.prisma.adminPasswordReset.findUnique({
      where: { tokenHash },
    });
    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.adminUser.update({
        where: { id: stored.adminUserId },
        data: { passwordHash },
      }),
      this.prisma.adminPasswordReset.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
      // Revoke every outstanding session on password change.
      this.prisma.adminRefreshToken.updateMany({
        where: { adminUserId: stored.adminUserId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async beginTwoFactorSetup(
    adminUserId: string,
  ): Promise<{ secret: string; otpauthUri: string }> {
    const user = await this.prisma.adminUser.findUniqueOrThrow({
      where: { id: adminUserId },
    });
    const secret = generateBase32Secret();
    // Stored but not yet marked enabled until confirmed with a valid code.
    await this.prisma.adminUser.update({
      where: { id: adminUserId },
      data: { twoFactorSecret: secret },
    });
    return { secret, otpauthUri: totpUri(secret, user.email) };
  }

  async confirmTwoFactorSetup(
    adminUserId: string,
    code: string,
  ): Promise<void> {
    const user = await this.prisma.adminUser.findUniqueOrThrow({
      where: { id: adminUserId },
    });
    if (!user.twoFactorSecret || !verifyTotp(user.twoFactorSecret, code)) {
      throw new UnauthorizedException('Invalid two-factor code');
    }
    await this.prisma.adminUser.update({
      where: { id: adminUserId },
      data: { twoFactorEnabled: true },
    });
  }

  async disableTwoFactor(adminUserId: string): Promise<void> {
    await this.prisma.adminUser.update({
      where: { id: adminUserId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
  }

  async getProfile(adminUserId: string) {
    const user = await this.prisma.adminUser.findUniqueOrThrow({
      where: { id: adminUserId },
      include: { role: { include: { permissions: true } } },
    });
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatarUrl ?? undefined,
      roleId: user.roleId,
      roleName: user.role.name,
      status: user.status,
      twoFactorEnabled: user.twoFactorEnabled,
      lastLoginAt: user.lastLoginAt?.toISOString(),
      createdAt: user.createdAt.toISOString(),
      permissions: user.role.permissions.map(
        (permission) => `${permission.resource}:${permission.action}`,
      ),
    };
  }
}
