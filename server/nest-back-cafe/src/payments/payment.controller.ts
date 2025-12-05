import { Controller, Post, Body, Req, Res, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  @Post('webhook')
  async handleWebhook(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: any,
  ) {
    this.logger.log('=== ЮKassa WEBHOOK получен ===');

    // Логируем заголовки
    this.logger.debug('Headers: ' + JSON.stringify(req.headers, null, 2));

    // Логируем тело
    try {
      this.logger.debug('Body: ' + JSON.stringify(body, null, 2));
    } catch (e) {
      this.logger.error('Ошибка логирования BODY', e);
    }

    // Обработка событий
    if (body.event === 'payment.succeeded') {
      this.logger.log(
        `Платёж успешен — ID: ${body.object.id}, сумма: ${body.object.amount.value}`
      );
    }

    if (body.event === 'payment.waiting_for_capture') {
      this.logger.warn(`Платёж создан, ждёт подтверждения — ID: ${body.object.id}`);
    }

    if (body.event === 'refund.succeeded') {
      this.logger.warn(
        `Возврат выполнен — refundId = ${body.object.id}, paymentId = ${body.object.payment_id}`
      );
    }

    // YooKassa должна получить 200
    return res.status(200).send('ok');
  }
}
