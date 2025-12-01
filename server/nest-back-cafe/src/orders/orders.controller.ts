
import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Patch,
  Param,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order } from './orders.entity';
import { PaymentService } from '../payments/payment.service'; 

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly paymentService: PaymentService,
  ) {}

  // Создать новый заказ
  @Post()
  async create(@Body() orderData: Partial<Order>) {
    // Устанавливаем адрес для самовывоза
    if (orderData.type !== 'delivery') {
      orderData.address = 'Самовывоз';
    }

    // Создаём заказ
    const order = await this.ordersService.createOrder(orderData);

    // Если онлайн-оплата — создаём платёж
    if (order.paymentMethod === 'online') {
      try {
        const { confirmationUrl } = await this.paymentService.createPaymentForOrder(order);
        return {
          ...order,
          paymentUrl: confirmationUrl,
        };
      } catch (error) {
        // Опционально: удалить заказ или пометить как ошибку
        throw new HttpException(
          'Не удалось создать платёж. Попробуйте позже.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }

    // Для других способов оплаты — возвращаем просто заказ
    return order;
  }

  // Получить все заказы
  @Get()
  getAll(@Query('status') status?: string): Promise<Order[]> {
    if (status) {
      return this.ordersService.getByStatus(status);
    }
    return this.ordersService.getAll();
  }

  // Обновить статус заказа
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: number,
    @Body('status') status: string,
  ): Promise<void> {
    return this.ordersService.updateStatus(id, status);
  }
}