import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpsertTestimonialDto } from './dto/upsert-testimonial.dto';

@Injectable()
export class TestimonialsService {
  constructor(private readonly prisma: PrismaService) {}

  findFeatured() {
    return this.prisma.testimonial.findMany({
      where: { featured: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  findAll() {
    return this.prisma.testimonial.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async findOne(id: string) {
    const testimonial = await this.prisma.testimonial.findUnique({
      where: { id },
    });
    if (!testimonial) throw new NotFoundException('Testimonial not found');
    return testimonial;
  }

  create(dto: UpsertTestimonialDto) {
    return this.prisma.testimonial.create({ data: dto });
  }

  async update(id: string, dto: UpsertTestimonialDto) {
    await this.findOne(id);
    return this.prisma.testimonial.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.testimonial.delete({ where: { id } });
  }
}
