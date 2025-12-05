// src/payment/payment.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { YooCheckout } from '@a2seven/yoo-checkout'; // ← только это
import { v4 as uuidv4 } from 'uuid';
import { Order } from '../orders/orders.entity';
import { TelegramService } from '../telegram_bot/telegram.service'; // ← важно

@Injectable()
export class PaymentService implements OnModuleInit {
  private yooCheckout: YooCheckout | null = null; // ← явно допускаем null
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private readonly telegramService: TelegramService,
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

  // Логируем тело запроса
  this.logger.debug(`Headers: ${JSON.stringify(data.headers || {})}`);
  this.logger.debug(`Body: ${JSON.stringify(data)}`);

  // Проверяем событие
  if (data.event !== 'payment.succeeded') {
    this.logger.log(`Пропущено событие: ${data.event}`);
    return;
  }

  const payment = data.object;

  // Попробуем достать orderId из metadata
  let orderId: number | null = null;

  if (payment.metadata && payment.metadata.order_id) {
    orderId = Number(payment.metadata.order_id);
  }

  // Если orderId нет в metadata, пытаемся вытащить из description
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

  // Обновляем статус в базе
  order.status = 'paid';
  await this.orderRepository.save(order);
  this.logger.log(`Платёж обновлён в базе: заказ #${orderId}, сумма: ${payment.amount.value}`);

  // Отправляем сообщение в Telegram
  try {
    await this.telegramService.sendPaymentStatus(order, payment.amount.value);
  } catch (e) {
    this.logger.error('Ошибка отправки сообщения в Telegram', e);
  }
}



}