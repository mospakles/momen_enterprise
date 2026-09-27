import { Module } from '@nestjs/common';
import { AdminEmailTemplatesController } from './admin-email-templates.controller';
import { EmailTemplatesService } from './email-templates.service';

@Module({
  controllers: [AdminEmailTemplatesController],
  providers: [EmailTemplatesService],
  exports: [EmailTemplatesService],
})
export class EmailTemplatesModule {}
