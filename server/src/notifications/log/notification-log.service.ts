import { Injectable } from '@nestjs/common';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationLogService {
  constructor(private readonly prisma: PrismaService) {}

  log(entry: {
    triggerId?: string;
    channel: NotificationChannel;
    recipient: string;
    subject: string;
    status: NotificationStatus;
  }) {
    return this.prisma.notificationLogEntry.create({ data: entry });
  }

  findAll(filters: { triggerId?: string; status?: NotificationStatus }) {
    return this.prisma.notificationLogEntry.findMany({
      where: {
        ...(filters.triggerId ? { triggerId: filters.triggerId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }
}
