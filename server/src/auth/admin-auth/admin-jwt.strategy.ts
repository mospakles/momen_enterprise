import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { accessCookieName, readCookie } from '../../common/auth-cookies';

interface AdminJwtPayload {
  sub: string;
  type: 'admin';
}

export interface AuthenticatedAdminUser {
  type: 'admin';
  id: string;
  email: string;
  name: string;
  roleId: string;
  roleName: string;
  status: string;
  /** `${resource}:${action}` pairs, e.g. "products:edit" — O(1) checks in PermissionsGuard. */
  permissions: Set<string>;
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => readCookie(request, accessCookieName('admin')),
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: AdminJwtPayload): Promise<AuthenticatedAdminUser> {
    if (payload.type !== 'admin') throw new UnauthorizedException();

    const user = await this.prisma.adminUser.findUnique({
      where: { id: payload.sub },
      include: { role: { include: { permissions: true } } },
    });
    if (!user || user.status !== 'active') throw new UnauthorizedException();

    return {
      type: 'admin',
      id: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      roleName: user.role.name,
      status: user.status,
      permissions: new Set(
        user.role.permissions.map((p) => `${p.resource}:${p.action}`),
      ),
    };
  }
}
