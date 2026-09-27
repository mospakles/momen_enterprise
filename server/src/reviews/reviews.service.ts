import { Injectable, NotFoundException } from '@nestjs/common';
import { ReviewStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  findApprovedForProduct(productId: string) {
    return this.prisma.review.findMany({
      where: { productId, status: ReviewStatus.approved },
      orderBy: { createdAt: 'desc' },
    });
  }

  findAllAdmin(status?: ReviewStatus) {
    return this.prisma.review.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  create(dto: CreateReviewDto, customerId?: string) {
    // Submitted reviews start pending moderation — never auto-approved.
    return this.prisma.review.create({
      data: { ...dto, customerId, status: ReviewStatus.pending },
    });
  }

  async setStatus(id: string, status: ReviewStatus) {
    await this.ensureExists(id);
    return this.prisma.review.update({ where: { id }, data: { status } });
  }

  async toggleFeatured(id: string) {
    const review = await this.ensureExists(id);
    return this.prisma.review.update({
      where: { id },
      data: { featured: !review.featured },
    });
  }

  async respond(id: string, message: string) {
    await this.ensureExists(id);
    return this.prisma.review.update({
      where: { id },
      data: { responseMessage: message, respondedAt: new Date() },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.review.delete({ where: { id } });
  }

  private async ensureExists(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    return review;
  }
}
