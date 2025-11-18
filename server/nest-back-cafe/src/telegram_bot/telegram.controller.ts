import { Controller, Post, Param } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { OrdersService } from '../orders/orders.service';

@Controller('telegram')
export class TelegramController {
  constructor(
    private readonly telegramService: TelegramService,
    private readonly ordersService: OrdersService,
  ) {}

  // отправить заказ в ТГ вручную: /telegram/send/15
  @Post('send/:id')
  async send(@Param('id') id: number) {
    const order = await this.ordersService.findOne(id);
    await this.telegramService.sendOrderToTelegram(order);
    return { ok: true };
  }
}
