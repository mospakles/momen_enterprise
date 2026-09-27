import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  findMine(customerId: string) {
    return this.prisma.wishlistItem.findMany({
      where: { customerId },
      include: {
        product: {
          select: {
            id: true,
            slug: true,
            name: true,
            images: true,
            price: true,
            salePrice: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async add(customerId: string, productId: string) {
    return this.prisma.wishlistItem
      .create({ data: { customerId, productId } })
      .catch((error: unknown) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException('Already in wishlist');
        }
        throw error;
      });
  }

  async remove(customerId: string, productId: string) {
    await this.prisma.wishlistItem.deleteMany({
      where: { customerId, productId },
    });
  }
}
