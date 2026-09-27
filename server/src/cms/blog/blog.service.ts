import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PublishStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpsertBlogPostDto } from './dto/upsert-blog-post.dto';

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  private publishedWhere(): Prisma.BlogPostWhereInput {
    return {
      OR: [
        { status: PublishStatus.published },
        { status: PublishStatus.scheduled, publishAt: { lte: new Date() } },
      ],
    };
  }

  findPublished() {
    return this.prisma.blogPost.findMany({
      where: this.publishedWhere(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPublishedBySlug(slug: string) {
    const post = await this.prisma.blogPost.findFirst({
      where: { slug, ...this.publishedWhere() },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  findAllAdmin() {
    return this.prisma.blogPost.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  private normalize(dto: UpsertBlogPostDto) {
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
      throw new ConflictException('A post with that slug already exists');
    }
    throw error;
  }

  create(dto: UpsertBlogPostDto) {
    return this.prisma.blogPost
      .create({ data: this.normalize(dto) })
      .catch(this.handleUniqueSlug);
  }

  async update(id: string, dto: UpsertBlogPostDto) {
    await this.findOne(id);
    return this.prisma.blogPost
      .update({ where: { id }, data: this.normalize(dto) })
      .catch(this.handleUniqueSlug);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.blogPost.delete({ where: { id } });
  }
}
