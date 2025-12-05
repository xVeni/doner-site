
import { Module, forwardRef } from '@nestjs/common';
import { TelegramService } from '../telegram_bot/telegram.service';
import { TelegramController } from '../telegram_bot/telegram.controller';
import { OrdersModule } from '../orders/orders.module';
import { PaymentModule } from 'src/payments/payment.module';

@Module({
  imports: [
    forwardRef(() => OrdersModule),
    forwardRef(() => PaymentModule)
  ],
  providers: [TelegramService],
  controllers: [TelegramController],
  exports: [TelegramService],
})
export class TelegramModule {}
