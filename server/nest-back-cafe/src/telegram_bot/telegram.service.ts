import { Injectable, forwardRef, Inject, Logger } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { Order } from '../orders/orders.entity';
import TelegramBot from 'node-telegram-bot-api';

@Injectable()
export class TelegramService {
  private bot: TelegramBot;
  private chatId: string;
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
  ) {
    const token = process.env.TG_BOT_TOKEN;
    const chatId = process.env.TG_CHAT_ID;

    if (!token || !chatId) {
      throw new Error(
        'Не установлены переменные окружения TG_BOT_TOKEN или TG_CHAT_ID',
      );
    }

    this.chatId = chatId;
    this.bot = new TelegramBot(token);
  }

  async handleUpdate(update: any) {
  if (update.callback_query) {
    const query = update.callback_query;
    const data = query.data;
    const [action, orderIdStr] = data.split('_');
    const orderId = Number(orderIdStr);

    // Завершить заказ
    if (action === 'complete' && !isNaN(orderId)) {
      await this.ordersService.updateTelegramStatus(orderId, 'completed');
      const order = await this.ordersService.findOne(orderId);

      const newText = this.formatOrder(order);
      await this.bot.editMessageText(newText, {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [] },
      });

      return await this.bot.answerCallbackQuery(query.id);
    }

    // 🔄 Обновить статус оплаты
    if (action === 'refresh' && !isNaN(orderId)) {
      const order = await this.ordersService.findOne(orderId);
      const newText = this.formatOrder(order);

      await this.bot.editMessageText(newText, {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '✔ Заказ обработан', callback_data: `complete_${order.id}` }],
          ],
        },
      });

      return await this.bot.answerCallbackQuery(query.id, {
        text: 'Статус обновлён 👍',
        show_alert: false,
      });
    }
  }
}

  private formatOrder(order: Order): string {
    const paymentMethodMap: Record<string, string> = {
      online: 'Онлайн',
      card: 'Карта',
      cash: 'Наличные',
    };

    const orderTypeMap: Record<string, string> = {
      delivery: 'Доставка',
      pickup: 'Самовывоз',
    };

    const paymentMethodText = paymentMethodMap[order.paymentMethod] || order.paymentMethod;
    const orderTypeText = orderTypeMap[order.type?.toLowerCase()] || order.type;

    const paymentStatusText =
      order.paymentMethod === 'online'
        ? order.is_paid
          ? '✅ ОПЛАЧЕНО'
          : '⏳ ОЖИДАЕТ ОПЛАТЫ'
        : '💳 ОПЛАТА НА МЕСТЕ';

    const changeText = order.change_amount ? `${order.change_amount} ₽` : '—';

    const itemsText = order.items
      .map((i) => `— ${i.title} — ${i.quantity} шт.`)
      .join('\n');

    const addressLine =
      orderTypeMap[order.type?.toLowerCase()] === 'Доставка'
        ? `🏠 *Адрес:* ${order.address || '—'}\n`
        : '';

    return (
      `🆕 *Новый заказ №${order.id}*\n\n` +
      `👤 *Имя:* ${order.customer_name}\n` +
      `📞 *Телефон:* ${order.phone}\n` +
      `📍 *Способ получения:* ${orderTypeText}\n` +
      addressLine +
      `💬 *Комментарий:* ${order.comment || '—'}\n` +
      `💳 *Способ оплаты:* ${paymentMethodText}\n` +
      `💵 *Статус оплаты:* ${paymentStatusText}\n` +
      `💵 *Сдача с:* ${changeText}\n` +
      `⏰ *Время оформления:* ${order.time}\n\n` +
      `🍱 *Состав заказа:*\n${itemsText}\n\n` +
      `💰 *Стоимость доставки:* ${order.deliveryPrice} ₽\n\n` +
      `💰 *Итого:* ${order.total} ₽\n\n` +
      `🔖 *Статус:* ${order.status_tgBot}`
    );
  }

  async sendOrderToTelegram(order: Order): Promise<void> {
    const text = this.formatOrder(order);

    const sentMessage = await this.bot.sendMessage(this.chatId, text, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '✔ Заказ обработан', callback_data: `complete_${order.id}` }], // ✅ ИСПРАВЛЕНО
        ],
      },
    });

    // Сохраняем только message_id в заказе (один раз!)
    await this.ordersService.updateTelegramMessageId(order.id, sentMessage.message_id.toString());
  }

  async setWebhook() {
    const webhookUrl = `${process.env.WEBHOOK_URL}/telegram/webhook`;
    await this.bot.setWebHook(webhookUrl);
  }

 async sendPaymentStatus(order: Order, amount: string) {
  this.logger.log(`📤 [TELEGRAM] Обработка оплаты для заказа ${order.id}`);

  // 1. Обновляем заказ
  await this.ordersService.updateAfterPayment(order.id);

  // 2. Получаем свежие данные
  const freshOrder = await this.ordersService.findOne(order.id);

  // 3. Добавляем кнопку "Обновить статус оплаты"
  if (freshOrder.telegram_message_id) {
    try {
      const newText = this.formatOrder(freshOrder);

      await this.bot.editMessageReplyMarkup(
        {
          inline_keyboard: [
            [
              { text: '🔄 Обновить статус оплаты', callback_data: `refresh_${freshOrder.id}` }
            ],
            [
              { text: '✔ Заказ обработан', callback_data: `complete_${freshOrder.id}` }
            ]
          ],
        },
        {
          chat_id: this.chatId,
          message_id: Number(freshOrder.telegram_message_id),
        },
      );

      this.logger.log(`Добавлена кнопка обновления оплаты для заказа ${order.id}`);
    } catch (e) {
      this.logger.error(`Ошибка добавления кнопки`, e);
    }
  }

  // 4. Отдельным сообщением отправляем уведомление об оплате
  const text = `💳 *Оплата подтверждена!*\n\nЗаказ №${order.id} оплачен онлайн.\nСумма: ${amount} ₽`;
  await this.bot.sendMessage(this.chatId, text, { parse_mode: 'Markdown' });
}

async sendPaymentFailed(order: Order, reason: string) {
  const text =
    `❌ *Ошибка оплаты!*\n\n` +
    `Заказ №${order.id} не был оплачен.\n` +
    `Причина: _${reason}_\n\n` +
    `Пользователь мог закрыть страницу или отменить платеж.`;

  await this.bot.sendMessage(this.chatId, text, {
    parse_mode: 'Markdown',
  });
}


}