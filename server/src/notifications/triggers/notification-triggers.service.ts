import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationEvent } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpdateTriggerDto } from './dto/update-trigger.dto';

@Injectable()
export class NotificationTriggersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.notificationTrigger.findMany({
      orderBy: { event: 'asc' },
    });
  }

  async findByEvent(event: NotificationEvent) {
    return this.prisma.notificationTrigger.findUnique({ where: { event } });
  }

  async update(id: string, dto: UpdateTriggerDto) {
    const trigger = await this.prisma.notificationTrigger.findUnique({
      where: { id },
    });
    if (!trigger) throw new NotFoundException('Notification trigger not found');
    return this.prisma.notificationTrigger.update({ where: { id }, data: dto });
  }
}
