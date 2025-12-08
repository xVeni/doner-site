import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { YooCheckout } from '@a2seven/yoo-checkout';
import { v4 as uuidv4 } from 'uuid';
import { Order } from '../orders/orders.entity';
import { TelegramService } from '../telegram_bot/telegram.service';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class PaymentService implements OnModuleInit {
  private yooCheckout: YooCheckout | null = null;
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private readonly telegramService: TelegramService,
    private readonly ordersService: OrdersService, // ← добавлено
  ) {}

  onModuleInit() {
    const shopId = process.env.SHOP_ID;
    const secretKey = process.env.API_KEY_PAYMENT;

    if (!shopId || !secretKey) {
      this.logger.warn('ЮKassa не настроена: отсутствуют SHOP_ID или API_KEY_PAYMENT');
      return;
    }

    this.yooCheckout = new YooCheckout({
      shopId,
      secretKey,
    });
  }

  async createPaymentForOrder(order: Order): Promise<{ paymentId: string; confirmationUrl: string }> {
    if (!this.yooCheckout) {
      throw new Error('ЮKassa не инициализирована.');
    }

    if (order.paymentMethod !== 'online') {
      throw new Error('Оплата через ЮKassa доступна только при способе оплаты "online"');
    }

    const idempotenceKey = uuidv4();
    const amountValue = Number(order.total).toFixed(2);

    const payload = {
      amount: { value: amountValue, currency: 'RUB' },
      confirmation: {
        type: 'redirect',
        return_url: `${process.env.FRONTEND_URL}/success/${order.id}`,
      },
      description: `Заказ #${order.id} в ресторане`,
      meta: { order_id: String(order.id), phone: order.phone || '' },
      capture: true,
    };

    try {
      // @ts-ignore
      const payment = await this.yooCheckout.createPayment(payload, idempotenceKey);

      order.payment_id = payment.id;
      order.payment_url = payment.confirmation?.confirmation_url || '';
      await this.orderRepository.save(order);

      return {
        paymentId: payment.id,
        confirmationUrl: payment.confirmation?.confirmation_url || '',
      };
    } catch (error: any) {
      this.logger.error(`Ошибка создания платежа для заказа #${order.id}`, error.stack);
      throw new Error(`Не удалось создать платёж: ${error.message || 'неизвестная ошибка'}`);
    }
  }

  async handleWebhook(data: any) {
    this.logger.log('=== ЮKassa WEBHOOK получен ===');
    this.logger.debug(`Body: ${JSON.stringify(data)}`);

    if (data.event !== 'payment.succeeded') {
      this.logger.log(`Пропущено событие: ${data.event}`);
      return;
    }

    const payment = data.object;
    let orderId: number | null = null;

    if (payment.metadata?.order_id) {
      orderId = Number(payment.metadata.order_id);
    }

    if (!orderId && payment.description) {
      const match = payment.description.match(/Заказ #(\d+)/);
      if (match) {
        orderId = Number(match[1]);
        this.logger.log(`[DEBUG] orderId извлечён из description: ${orderId}`);
      }
    }

    if (!orderId) {
      this.logger.error('Не удалось определить orderId из webhook');
      return;
    }

    const order = await this.orderRepository.findOneBy({ id: orderId });
    if (!order) {
      this.logger.error(`Заказ с id ${orderId} не найден в базе`);
      return;
    }

    // Обновляем заказ через сервис (is_paid = true и т.д.)
    await this.ordersService.updateAfterPayment(orderId);

    this.logger.log(`Платёж обновлён: заказ #${orderId}, сумма: ${payment.amount.value}`);

    // Обновляем заказ через сервис
await this.ordersService.updateAfterPayment(orderId);

// Получаем обновлённый заказ
const updatedOrder = await this.orderRepository.findOneBy({ id: orderId });
if (!updatedOrder) {
  this.logger.error(`Заказ #${orderId} не найден при попытке отправки в Telegram`);
  return;
}

// Теперь updatedOrder точно не null
await this.telegramService.sendPaymentStatus(updatedOrder, payment.amount.value);
  }
}