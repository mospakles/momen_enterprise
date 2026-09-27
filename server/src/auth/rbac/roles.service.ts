import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PermissionAction, PermissionResource } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import type { UpsertRoleDto } from './dto/upsert-role.dto';

const VALID_RESOURCES = new Set<string>(Object.values(PermissionResource));
const VALID_ACTIONS = new Set<string>(Object.values(PermissionAction));

export interface ActorContext {
  id: string;
  name: string;
}

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  findAll() {
    return this.prisma.role.findMany({
      include: { permissions: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { permissions: true },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  private flattenPermissions(permissions: UpsertRoleDto['permissions']) {
    const rows: { resource: PermissionResource; action: PermissionAction }[] =
      [];
    for (const [resource, actions] of Object.entries(permissions)) {
      if (!VALID_RESOURCES.has(resource))
        throw new BadRequestException(
          `Unknown permission resource "${resource}"`,
        );
      for (const action of actions ?? []) {
        if (!VALID_ACTIONS.has(action))
          throw new BadRequestException(
            `Unknown permission action "${action}"`,
          );
        rows.push({ resource: resource as PermissionResource, action });
      }
    }
    return rows;
  }

  async create(dto: UpsertRoleDto, actor: ActorContext) {
    const existing = await this.prisma.role.findUnique({
      where: { name: dto.name },
    });
    if (existing)
      throw new ConflictException('A role with that name already exists');

    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description,
        isSystem: dto.isSystem ?? false,
        permissions: { create: this.flattenPermissions(dto.permissions) },
      },
      include: { permissions: true },
    });

    await this.auditLog.log({
      actorId: actor.id,
      actorName: actor.name,
      action: 'role.create',
      resource: 'admin_users',
      resourceId: role.id,
      summary: `Created role "${role.name}"`,
      after: dto.permissions,
    });

    return role;
  }

  async update(id: string, dto: UpsertRoleDto, actor: ActorContext) {
    const before = await this.findOne(id); // 404s before touching anything

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      return tx.role.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          // isSystem is only ever set at seed time, never flipped via the API.
          permissions: { create: this.flattenPermissions(dto.permissions) },
        },
        include: { permissions: true },
      });
    });

    await this.auditLog.log({
      actorId: actor.id,
      actorName: actor.name,
      action: 'role.update',
      resource: 'admin_users',
      resourceId: id,
      summary: `Updated permissions on role "${updated.name}"`,
      before: before.permissions.map((p) => `${p.resource}:${p.action}`),
      after: updated.permissions.map((p) => `${p.resource}:${p.action}`),
    });

    return updated;
  }

  async remove(id: string, actor: ActorContext) {
    const role = await this.findOne(id);
    if (role.isSystem)
      throw new ForbiddenException('System roles cannot be deleted');
    const inUse = await this.prisma.adminUser.count({ where: { roleId: id } });
    if (inUse > 0)
      throw new ConflictException('Role is still assigned to admin users');
    await this.prisma.role.delete({ where: { id } });

    await this.auditLog.log({
      actorId: actor.id,
      actorName: actor.name,
      action: 'role.delete',
      resource: 'admin_users',
      resourceId: id,
      summary: `Deleted role "${role.name}"`,
      before: { name: role.name },
    });
  }
}
