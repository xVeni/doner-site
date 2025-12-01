// src/payment/payment.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { YooCheckout } from '@a2seven/yoo-checkout'; // ← только это
import { v4 as uuidv4 } from 'uuid';
import { Order } from '../orders/orders.entity';

@Injectable()
export class PaymentService implements OnModuleInit {
  private yooCheckout: YooCheckout | null = null; // ← явно допускаем null
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
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

}