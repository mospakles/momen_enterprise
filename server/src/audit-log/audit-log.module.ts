import { Global, Module } from '@nestjs/common';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';

// Global so any module can inject AuditLogService (products, roles, orders,
// refunds once Payments exists, ...) without importing AuditLogModule everywhere.
@Global()
@Module({
  controllers: [AuditLogController],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
