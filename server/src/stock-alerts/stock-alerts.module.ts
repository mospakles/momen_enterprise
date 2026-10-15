import { Module } from '@nestjs/common';
import { StockAlertsService } from './stock-alerts.service';
import { AdminStockAlertsController, StockAlertsController } from './stock-alerts.controller';

@Module({
  controllers: [StockAlertsController, AdminStockAlertsController],
  providers: [StockAlertsService],
})
export class StockAlertsModule {}
