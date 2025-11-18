import { Controller, Post, Body, Get, Query, Patch, Param } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order } from './orders.entity';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // Создать новый заказ
  @Post()
  create(@Body() orderData: Partial<Order>): Promise<Order> {
    if (orderData.type !== 'delivery') {
      orderData.address = 'Самовывоз';
    }
    return this.ordersService.createOrder(orderData);
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
