import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { accessCookieName, readCookie } from '../../common/auth-cookies';

export interface CustomerJwtPayload {
  sub: string;
  type: 'customer';
}

export interface AuthenticatedCustomer {
  type: 'customer';
  id: string;
  email: string;
  name: string;
  status: string;
}

@Injectable()
export class CustomerJwtStrategy extends PassportStrategy(
  Strategy,
  'customer-jwt',
) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => readCookie(request, accessCookieName('customer')),
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: CustomerJwtPayload): Promise<AuthenticatedCustomer> {
    if (payload.type !== 'customer') throw new UnauthorizedException();

    const customer = await this.prisma.customer.findUnique({
      where: { id: payload.sub },
    });
    if (!customer || customer.status === 'disabled')
      throw new UnauthorizedException();

    return {
      type: 'customer',
      id: customer.id,
      email: customer.email,
      name: customer.name,
      status: customer.status,
    };
  }
}
