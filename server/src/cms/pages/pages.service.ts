import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { isEffectivelyPublished } from '../../common/utils/publish-status.util';
import type { UpsertPageDto } from './dto/upsert-page.dto';

@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublishedBySlug(slug: string) {
    const page = await this.prisma.cMSPage.findUnique({ where: { slug } });
    // CMSPage's frontend-contract field is `status`, not `publishStatus`
    // (unlike Product/Category/Collection) — isEffectivelyPublished takes
    // the generic shape, so it's normalized at the call site instead.
    if (
      !page ||
      !isEffectivelyPublished({
        publishStatus: page.status,
        publishAt: page.publishAt,
      })
    ) {
      throw new NotFoundException('Page not found');
    }
    return page;
  }

  findAllAdmin() {
    return this.prisma.cMSPage.findMany({ orderBy: { updatedAt: 'desc' } });
  }

  async findOne(id: string) {
    const page = await this.prisma.cMSPage.findUnique({ where: { id } });
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  private normalize(dto: UpsertPageDto) {
    return {
      ...dto,
      publishAt: dto.publishAt ? new Date(dto.publishAt) : null,
      seo: dto.seo as Prisma.InputJsonValue,
    };
  }

  private handleUniqueSlug(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('A page with that slug already exists');
    }
    throw error;
  }

  create(dto: UpsertPageDto) {
    return this.prisma.cMSPage
      .create({ data: this.normalize(dto) })
      .catch(this.handleUniqueSlug);
  }

  async update(id: string, dto: UpsertPageDto) {
    await this.findOne(id);
    return this.prisma.cMSPage
      .update({ where: { id }, data: this.normalize(dto) })
      .catch(this.handleUniqueSlug);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.cMSPage.delete({ where: { id } });
  }
}
