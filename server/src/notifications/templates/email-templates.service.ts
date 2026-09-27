import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpsertEmailTemplateDto } from './dto/upsert-email-template.dto';

@Injectable()
export class EmailTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.emailTemplate.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const template = await this.prisma.emailTemplate.findUnique({
      where: { id },
    });
    if (!template) throw new NotFoundException('Email template not found');
    return template;
  }

  async findByKey(key: string) {
    const template = await this.prisma.emailTemplate.findUnique({
      where: { key },
    });
    if (!template)
      throw new NotFoundException(`Email template "${key}" not found`);
    return template;
  }

  private handleUniqueKey(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('A template with that key already exists');
    }
    throw error;
  }

  create(dto: UpsertEmailTemplateDto) {
    return this.prisma.emailTemplate
      .create({ data: dto })
      .catch(this.handleUniqueKey);
  }

  async update(id: string, dto: UpsertEmailTemplateDto) {
    await this.findOne(id);
    return this.prisma.emailTemplate
      .update({ where: { id }, data: dto })
      .catch(this.handleUniqueKey);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.emailTemplate.delete({ where: { id } });
  }
}
