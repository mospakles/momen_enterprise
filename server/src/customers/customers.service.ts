import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AddCustomerNoteDto } from './dto/add-customer-note.dto';
import type { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(search?: string) {
    const where: Prisma.CustomerWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    return this.prisma.customer.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        tags: true,
        marketingOptIn: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Aggregated CRM profile view — everything the admin customer detail page
   * needs in one call: addresses, measurement profiles, orders, wishlist,
   * reviews, internal notes. */
  async findOneAggregated(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      omit: { passwordHash: true },
      include: {
        addresses: true,
        measurementProfiles: { include: { history: true } },
        orders: { orderBy: { createdAt: 'desc' } },
        wishlistItems: {
          include: {
            product: {
              select: {
                id: true,
                slug: true,
                name: true,
                images: true,
                price: true,
              },
            },
          },
        },
        reviews: true,
        notes: { orderBy: { createdAt: 'desc' } },
        socialAccounts: { select: { provider: true, createdAt: true } },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.ensureExists(id);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async addNote(
    id: string,
    dto: AddCustomerNoteDto,
    authorId: string,
    authorName: string,
  ) {
    await this.ensureExists(id);
    await this.prisma.customerNote.create({
      data: { customerId: id, authorId, authorName, message: dto.message },
    });
    return this.findOneAggregated(id);
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.customer.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Customer not found');
  }
}
