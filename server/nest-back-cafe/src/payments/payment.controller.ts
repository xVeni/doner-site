import { Controller, Post, Body, Req, Res, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PaymentService } from './payment.service';

@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

 constructor(private readonly paymentService: PaymentService) {}

@Post('webhook')
async handleWebhook(@Req() req: Request, @Res() res: Response) {
  this.logger.log('=== ЮKassa WEBHOOK получен ===');

  let body: any;
  try {
    body = JSON.parse(req.body.toString()); // <-- ОБЯЗАТЕЛЬНО!
  } catch (e) {
    this.logger.error('Ошибка парсинга RAW JSON', e);
    return res.status(400).send('Invalid JSON');
  }

  try {
    await this.paymentService.handleWebhook(body);
  } catch (e) {
    this.logger.error('Ошибка обработки webhook', e);
  }

  return res.status(200).send('ok');
}

}
