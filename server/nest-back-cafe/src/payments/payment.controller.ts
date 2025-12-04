import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('webhook')
  @HttpCode(200)
  async handleYooKassaWebhook(@Body() data: any) {
    await this.paymentService.handleWebhook(data);
    return { ok: true };
  }
}
