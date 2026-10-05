import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import type { UpsertMeasurementProfileDto } from './dto/upsert-measurement-profile.dto';

interface Actor {
  id: string;
  name: string;
}

@Injectable()
export class MeasurementProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  findAllForCustomer(customerId: string) {
    return this.prisma.measurementProfile.findMany({
      where: { customerId },
      include: { history: { orderBy: { changedAt: 'desc' } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  findAllAdmin() {
    return this.prisma.measurementProfile.findMany({
      include: {
        customer: { select: { id: true, name: true, email: true } },
        history: { orderBy: { changedAt: 'desc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOwned(id: string, customerId: string) {
    const profile = await this.prisma.measurementProfile.findUnique({
      where: { id },
      include: { history: true },
    });
    if (!profile) throw new NotFoundException('Measurement profile not found');
    if (profile.customerId !== customerId) throw new ForbiddenException();
    return profile;
  }

  create(customerId: string, dto: UpsertMeasurementProfileDto) {
    return this.prisma.measurementProfile.create({
      data: {
        customerId,
        label: dto.label,
        unit: dto.unit,
        values: dto.values as Prisma.InputJsonValue,
      },
    });
  }

  /** `customerId` is whose profile this is (the ownership check); `actor` is
   * who's making the change — the same person for a customer's own
   * self-service edit, but an admin acting on a customer's behalf (support
   * correcting a typo, say — see AdminMeasurementProfilesController) is a
   * different `actor` than `customerId`, and that distinction is exactly
   * what `MeasurementProfileHistory.changedBy*` and the audit log need to
   * capture correctly — measurement edits are one of the mutation types
   * AGENTS.md calls out as "especially" important to audit. */
  async update(
    id: string,
    customerId: string,
    dto: UpsertMeasurementProfileDto,
    actor: Actor,
    isAdminActor = false,
  ) {
    const profile = await this.findOwned(id, customerId);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.measurementProfileHistory.create({
        data: {
          profileId: profile.id,
          values: profile.values as Prisma.InputJsonValue,
          unit: profile.unit,
          changedById: actor.id,
          changedByName: actor.name,
        },
      });
      return tx.measurementProfile.update({
        where: { id },
        data: {
          label: dto.label,
          unit: dto.unit,
          values: dto.values as Prisma.InputJsonValue,
        },
      });
    });

    if (isAdminActor) {
      await this.auditLog.log({
        actorId: actor.id,
        actorName: actor.name,
        action: 'measurement_profile.update',
        resource: 'measurements',
        resourceId: id,
        summary: `Edited measurement profile "${profile.label}" on behalf of a customer`,
        before: profile.values,
        after: dto.values,
      });
    }

    return updated;
  }

  async remove(id: string, customerId: string) {
    await this.findOwned(id, customerId);
    await this.prisma.measurementProfile.delete({ where: { id } });
  }

  async removeAsAdmin(id: string, customerId: string, actor: Actor) {
    const profile = await this.findOwned(id, customerId);
    await this.prisma.measurementProfile.delete({ where: { id } });
    await this.auditLog.log({
      actorId: actor.id,
      actorName: actor.name,
      action: 'measurement_profile.delete',
      resource: 'measurements',
      resourceId: id,
      summary: `Deleted measurement profile "${profile.label}" on behalf of a customer`,
      before: profile.values,
    });
  }
}
