import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './orders.entity';
import { TelegramService } from '../telegram_bot/telegram.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepo: Repository<Order>,

    private readonly telegramService: TelegramService, 
  ) {}

// Создать новый заказ
async createOrder(orderData: Partial<Order>): Promise<Order> {
  const order = this.ordersRepo.create(orderData);
  const savedOrder = await this.ordersRepo.save(order);
  await this.telegramService.sendOrderToTelegram(savedOrder);
  return savedOrder;
}

  // Получить все заказы
  getAll(): Promise<Order[]> {
    return this.ordersRepo.find({
      order: { created_at: 'DESC' }, // сортировка по дате
    });
  }

  // Получить заказы по статусу
  getByStatus(status: string): Promise<Order[]> {
    return this.ordersRepo.find({ where: { status } });
  }

  // Обновить статус заказа
  updateStatus(id: number, status: string): Promise<void> {
    return this.ordersRepo.update(id, { status }).then(() => {});
  }

async updateTelegramStatus(id: number, status: string) {
  await this.ordersRepo.update(id, { status_tgBot: status });
}

async findOne(id: number): Promise<Order> {
  const order = await this.ordersRepo.findOneBy({ id });
  if (!order) {
    throw new Error(`Order with ID ${id} not found`);
  }
  return order;
}

 // сохраняем paymentId в заказ
  async savePaymentId(orderId: number, paymentId: string) {
    await this.ordersRepo.update(orderId, { payment_id: paymentId });
  }

  // отмечаем заказ как оплаченный
  async markOrderPaid(paymentId: string) {
    const order = await this.ordersRepo.findOne({
      where: { payment_id: paymentId },
    });

    if (!order) return;

    order.status = 'paid';
    await this.ordersRepo.save(order);

    return order;
  }

}
