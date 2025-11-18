import { Module } from '@nestjs/common';
import { TelegramService } from '../telegram_bot/telegram.service';
import { TelegramController } from './telegram.controller';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule],
  providers: [TelegramService],
  controllers: [TelegramController],
  exports: [TelegramService],
})
export class TelegramModule {}
