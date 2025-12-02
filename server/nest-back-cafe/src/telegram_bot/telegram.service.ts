import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { Order } from '../orders/orders.entity';
import TelegramBot from 'node-telegram-bot-api';

@Injectable()
export class TelegramService {
  private bot: TelegramBot;
  private chatId: string;

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
    this.bot = new TelegramBot(token); // ❌ без polling
  }

  // Метод для обработки каждого update
  async handleUpdate(update: any) {
    // Проверяем, есть ли callback_query
    if (update.callback_query) {
      const query = update.callback_query;
      const data = query.data; // complete_12
      const [action, orderId] = data.split('_');

      if (action === 'complete') {
        const id = Number(orderId);

        // Обновляем заказ в базе
        await this.ordersService.updateTelegramStatus(id, 'completed');
        const order = await this.ordersService.findOne(id);

        // Обновляем сообщение в чате
        const newText = this.formatOrder(order);
        await this.bot.editMessageText(newText, {
          chat_id: query.message.chat.id,
          message_id: query.message.message_id,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [] }, // убираем кнопку
        });

        // Отвечаем Telegram
        await this.bot.answerCallbackQuery(query.id);
      }
    }

    // Можно добавить обработку обычных сообщений, если нужно
  }

  private formatOrder(order: Order): string {
    const itemsText = order.items
      .map((i) => `Блюдо ${i.title} — ${i.quantity} шт.`)
      .join('\n');

    return (
      `🆕 *Новый заказ №${order.id}*\n\n` +
      `👤 *Имя:* ${order.customer_name}\n` +
      `📞 *Телефон:* ${order.phone}\n` +
      `📍 *Тип:* ${order.type}\n` +
      `🏠 *Адрес:* ${order.address}\n` +
      `💬 *Комментарий:* ${order.comment || '-'}\n` +
      `💳 *Оплата:* ${order.paymentMethod}\n` +
      `💳 *Сдача с:* ${order.change_amount}\n` +
      `⏰ *Время:* ${order.time}\n\n` +
      `🍱 *Состав заказа:*\n${itemsText}\n\n` +
      `💰 *Сумма доставки уже включена в стоимость:* ${order.deliveryPrice} ₽\n\n` +
      `💰 *Сумма:* ${order.total} ₽\n\n` +
      `Статус: ${order.status_tgBot}`
    );
  }

  async sendOrderToTelegram(order: Order): Promise<void> {
    const text = this.formatOrder(order);

    await this.bot.sendMessage(this.chatId, text, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '✔ Заказ обработан', callback_data: `complete_${order.id}` }],
        ],
      },
    });
  }

  // Установка webhook
  async setWebhook() {
    const webhookUrl = `${process.env.WEBHOOK_URL}/telegram/webhook`;
    await this.bot.setWebHook(webhookUrl);
  }
}
