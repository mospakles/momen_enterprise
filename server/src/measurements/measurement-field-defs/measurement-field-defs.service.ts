import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { withApiUnit } from '../../common/utils/measurement-unit.util';
import type { UpsertMeasurementFieldDefDto } from './dto/upsert-measurement-field-def.dto';

@Injectable()
export class MeasurementFieldDefsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const defs = await this.prisma.measurementFieldDef.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return defs.map(withApiUnit);
  }

  async findOne(key: string) {
    const def = await this.prisma.measurementFieldDef.findUnique({
      where: { key },
    });
    if (!def) throw new NotFoundException('Measurement field not found');
    return withApiUnit(def);
  }

  async create(dto: UpsertMeasurementFieldDefDto) {
    const existing = await this.prisma.measurementFieldDef.findUnique({
      where: { key: dto.key },
    });
    if (existing)
      throw new ConflictException(
        'A measurement field with that key already exists',
      );
    return withApiUnit(
      await this.prisma.measurementFieldDef.create({ data: dto }),
    );
  }

  async update(key: string, dto: Omit<UpsertMeasurementFieldDefDto, 'key'>) {
    await this.findOne(key);
    return withApiUnit(
      await this.prisma.measurementFieldDef.update({
        where: { key },
        data: dto,
      }),
    );
  }

  async remove(key: string) {
    await this.findOne(key);
    // Products/categories that reference this field are implicit many-to-many
    // relations — Prisma drops the join rows automatically, no need to
    // unlink every product first.
    await this.prisma.measurementFieldDef.delete({ where: { key } });
  }
}
