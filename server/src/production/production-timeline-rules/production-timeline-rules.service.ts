import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TimelineRuleScope } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpsertTimelineRuleDto } from './dto/upsert-timeline-rule.dto';

@Injectable()
export class ProductionTimelineRulesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.productionTimelineRule.findMany({
      orderBy: [{ scope: 'asc' }, { scopeRef: 'asc' }],
    });
  }

  async findOne(id: string) {
    const rule = await this.prisma.productionTimelineRule.findUnique({
      where: { id },
    });
    if (!rule) throw new NotFoundException('Timeline rule not found');
    return rule;
  }

  private normalize(dto: UpsertTimelineRuleDto) {
    if (
      dto.standardDaysMin > dto.standardDaysMax ||
      dto.expressDaysMin > dto.expressDaysMax
    ) {
      throw new BadRequestException('Min days cannot exceed max days');
    }
    return {
      ...dto,
      scopeRef: dto.scope === TimelineRuleScope.global ? null : dto.scopeRef,
    };
  }

  // Postgres treats every NULL as distinct, so the `@@unique([scope,
  // scopeRef])` constraint can't stop a second "global" row (scopeRef is
  // always null there) — checked explicitly instead.
  private async ensureNoDuplicateGlobal(excludingId?: string) {
    const existing = await this.prisma.productionTimelineRule.findFirst({
      where: {
        scope: TimelineRuleScope.global,
        id: excludingId ? { not: excludingId } : undefined,
      },
    });
    if (existing)
      throw new ConflictException(
        'A global rule already exists — edit it instead of creating another',
      );
  }

  async create(dto: UpsertTimelineRuleDto) {
    const data = this.normalize(dto);
    if (data.scope === TimelineRuleScope.global)
      await this.ensureNoDuplicateGlobal();
    return this.prisma.productionTimelineRule
      .create({ data })
      .catch(this.handleUniqueScope);
  }

  async update(id: string, dto: UpsertTimelineRuleDto) {
    await this.findOne(id);
    const data = this.normalize(dto);
    if (data.scope === TimelineRuleScope.global)
      await this.ensureNoDuplicateGlobal(id);
    return this.prisma.productionTimelineRule
      .update({ where: { id }, data })
      .catch(this.handleUniqueScope);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.productionTimelineRule.delete({ where: { id } });
  }

  private handleUniqueScope(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'A rule for this scope already exists — edit it instead of creating another',
      );
    }
    throw error;
  }
}
