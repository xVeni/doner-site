import { Controller, Post, Body, Res, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { PaymentService } from './payment.service';

@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @Post('webhook')
  async handleWebhook(@Body() body: any, @Res() res: Response) {
    this.logger.log('=== ЮKassa WEBHOOK получен ===');
    this.logger.debug(`Тело webhook: ${JSON.stringify(body)}`);

    try {
      await this.paymentService.handleWebhook(body);
    } catch (e) {
      this.logger.error('Ошибка обработки webhook', e);
      // ❗ Важно: даже при ошибке — всё равно возвращаем 200!
    }

    // ЮKassa требует 200 OK в течение 10 секунд
    return res.status(200).send('OK');
  }
}