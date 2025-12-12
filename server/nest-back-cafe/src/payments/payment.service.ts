import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { YooCheckout } from '@a2seven/yoo-checkout';
import { v4 as uuidv4 } from 'uuid';
import { Order } from '../orders/orders.entity';
import { TelegramService } from '../telegram_bot/telegram.service';

@Injectable()
export class PaymentService implements OnModuleInit {
  private yooCheckout: YooCheckout | null = null;
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private readonly telegramService: TelegramService,
    // OrdersService НЕ нужен здесь, если обновляем напрямую
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
  const totalAmount = parseFloat(order.total.toString()).toFixed(2); // например: '123.45'

const cleanPhone = (phone: string): string => {
  // Оставляем только цифры
  let digits = phone.replace(/\D/g, '');

  // Если начинается с 8 — заменяем на 7
  if (digits.startsWith('8')) {
    digits = '7' + digits.slice(1);
  }

  // Если начинается не с 7 — добавляем 7 (на всякий случай)
  if (!digits.startsWith('7')) {
    digits = '7' + digits;
  }

  // Обрезаем до 11 цифр (7 + 10 цифр)
  return digits.slice(0, 11);
};

  // === ФОРМИРУЕМ ПОЗИЦИИ ЧЕКА ===
  const receiptItems = order.items.map((item) => {
    // Рассчитываем сумму позиции: price * quantity
    const itemTotal = (item.price * item.quantity).toFixed(2);

    return {
      description: item.title.length > 128 ? item.title.substring(0, 128) : item.title,
      quantity: item.quantity.toFixed(2), // например: "2.00"
      amount: {
        value: itemTotal, // ← сумма именно этой позиции
        currency: 'RUB',
      },
      vat_code: 1, // без НДС (для УСН/ЕНВД)
      payment_mode: 'full_payment',
      payment_subject: 'meal', // ← для ресторанов правильнее 'meal'
    };
  });

  // Необязательно, но можно проверить: сумма чека == total?
  const receiptTotal = receiptItems
    .reduce((sum, item) => sum + parseFloat(item.amount.value), 0)
    .toFixed(2);

  if (receiptTotal !== totalAmount) {
    this.logger.warn(
      `Несовпадение сумм: order.total=${totalAmount}, чек=${receiptTotal}. Используем order.total как основу.`
    );
    // ⚠️ ЮKassa может отклонить, если не совпадает!
    // Убедитесь, что фронт считает total как сумму price * quantity.
  }

  const payload = {
    amount: { value: totalAmount, currency: 'RUB' },
    confirmation: {
      type: 'redirect',
      return_url: `${process.env.FRONTEND_URL}/success/${order.id}`,
    },
    description: `Заказ #${order.id} в ресторане`,
    meta: { order_id: String(order.id), phone: order.phone || '' },
    capture: true,
    receipt: {
      customer: {
        email: order.email,
        phone: cleanPhone(order.phone),
      },
      items: receiptItems,
    },
  };

  try {
    // @ts-ignore — если типы не сходятся, но работает
    const payment = await this.yooCheckout.createPayment(payload, idempotenceKey);

    order.payment_id = payment.id;
    order.payment_url = payment.confirmation?.confirmation_url || '';
    await this.orderRepository.save(order);

    return {
      paymentId: payment.id,
      confirmationUrl: payment.confirmation?.confirmation_url || '',
    };
  } catch (error: any) {
    const errorMessage = error.message || 'неизвестная ошибка';
    const responseData = error?.response?.data || null;
    const status = error?.response?.status || 'no status';

    this.logger.error(
      `Ошибка создания платежа для заказа #${order.id}`,
      {
        errorMessage,
        status,
        responseData,
        orderId: order.id,
      },
      error.stack
    );
    throw new Error(`Не удалось создать платёж: ${errorMessage}`);
  }
}

 async handleWebhook(data: any) {
  this.logger.log('=== ЮKassa WEBHOOK получен ===');
  this.logger.debug(`Body: ${JSON.stringify(data)}`);

  const event = data.event;
  const payment = data.object;

  // Определяем orderId
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

  const order = await this.orderRepository.findOne({ where: { id: orderId } });
  if (!order) {
    this.logger.error(`Заказ с id ${orderId} не найден`);
    return;
  }

  // ===========================================================
  // 1. УСПЕШНАЯ ОПЛАТА
  // ===========================================================

  if (event === 'payment.succeeded') {
    order.is_paid = true;
    order.status = 'paid';
    order.status_tgBot = 'оплачено';
    await this.orderRepository.save(order);

    this.logger.log(`Платёж успешный: заказ #${orderId}`);
    await this.telegramService.sendPaymentStatus(order, payment.amount.value);
    return;
  }

  // ===========================================================
  // 2. ОШИБКА ОПЛАТЫ → отправляем сообщение в Telegram
  // ===========================================================

  const failureReason =
    payment.cancellation_details?.reason ||
    payment.cancellation_details?.party ||
    'неизвестная ошибка';

  await this.telegramService.sendPaymentFailed(order, failureReason);

  this.logger.warn(
    `❌ Оплата не прошла для заказа #${orderId}. Причина: ${failureReason}`,
  );
}

}