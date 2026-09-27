import { Injectable } from '@nestjs/common';
import { PermissionResource, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogEntryInput {
  actorId?: string;
  actorName: string;
  action: string;
  resource?: PermissionResource;
  resourceId?: string;
  summary: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  device?: string;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditLogEntryInput) {
    await this.prisma.auditLogEntry.create({
      data: {
        actorId: entry.actorId,
        actorName: entry.actorName,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        summary: entry.summary,
        before: entry.before as Prisma.InputJsonValue,
        after: entry.after as Prisma.InputJsonValue,
        ip: entry.ip,
        device: entry.device,
      },
    });
  }

  findAll(filters: {
    resource?: PermissionResource;
    resourceId?: string;
    actorId?: string;
  }) {
    return this.prisma.auditLogEntry.findMany({
      where: {
        ...(filters.resource ? { resource: filters.resource } : {}),
        ...(filters.resourceId ? { resourceId: filters.resourceId } : {}),
        ...(filters.actorId ? { actorId: filters.actorId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }
}
