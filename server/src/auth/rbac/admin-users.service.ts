import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { generateOpaqueToken, hashToken } from '../../common/utils/token.util';
import type { InviteAdminUserDto } from './dto/invite-admin-user.dto';
import type { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { ConfigService } from '@nestjs/config';
import { EmailSenderService } from '../../notifications/email-sender.service';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly emailSender: EmailSenderService,
  ) {}

  findAll() {
    return this.prisma.adminUser.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        roleId: true,
        role: { select: { name: true } },
        status: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.adminUser.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        roleId: true,
        role: { select: { name: true } },
        status: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('Admin user not found');
    return user;
  }

  /** Creates an invited (passwordless) account and returns a one-time setup
   * token — same mechanism as password reset — for the invitee to set their
   * own password. Sending that link is the Notifications module's job once
   * it exists; for now the token is returned directly to the caller. */
  async invite(dto: InviteAdminUserDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.adminUser.findUnique({
      where: { email },
    });
    if (existing)
      throw new ConflictException(
        'An admin account with that email already exists',
      );

    const role = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
    });
    if (!role) throw new NotFoundException('Role not found');

    // Placeholder hash — unusable as a real password — until the invitee
    // completes setup via the reset-password token below.
    const placeholderHash = await bcrypt.hash(generateOpaqueToken(), 12);

    const user = await this.prisma.adminUser.create({
      data: {
        name: dto.name.trim(),
        email,
        roleId: dto.roleId,
        status: 'invited',
        passwordHash: placeholderHash,
      },
    });

    const setupToken = generateOpaqueToken();
    await this.prisma.adminPasswordReset.create({
      data: {
        adminUserId: user.id,
        tokenHash: hashToken(setupToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const frontendUrl = this.config.get('FRONTEND_URL') ?? 'http://localhost:3000';
    await this.emailSender.send(
      user.email,
      'You have been invited to Momen Admin',
      `Complete your account setup within seven days: ${frontendUrl}/admin/reset-password?token=${encodeURIComponent(setupToken)}`,
    );
    return { user: await this.findOne(user.id) };
  }

  async update(id: string, dto: UpdateAdminUserDto) {
    await this.findOne(id);
    if (dto.roleId) {
      const role = await this.prisma.role.findUnique({
        where: { id: dto.roleId },
      });
      if (!role) throw new NotFoundException('Role not found');
    }
    return this.prisma.adminUser.update({ where: { id }, data: dto });
  }

  async remove(id: string, requestingUserId: string) {
    if (id === requestingUserId)
      throw new ForbiddenException('Cannot delete your own account');
    await this.findOne(id);
    await this.prisma.adminUser.delete({ where: { id } });
  }
}
