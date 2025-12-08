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
  // Локализация способа оплаты
  const paymentMethodMap: Record<string, string> = {
    online: 'Онлайн',
    card: 'Карта',
    cash: 'Наличные',
  };

  // Локализация способа получения
  const orderTypeMap: Record<string, string> = {
    delivery: 'Доставка',
    pickup: 'Самовывоз',
  };

  const paymentMethodText = paymentMethodMap[order.paymentMethod] || order.paymentMethod;
  const orderTypeText = orderTypeMap[order.type?.toLowerCase()] || order.type;

  const paymentStatusText =
    order.paymentMethod === 'online' ? 'ОЖИДАЕТ ОПЛАТЫ' : 'НЕ ТРЕБУЕТСЯ';

  const changeText = order.change_amount ? `${order.change_amount} ₽` : '—';

  const itemsText = order.items
    .map((i) => `— ${i.title} — ${i.quantity} шт.`)
    .join('\n');

  // Адрес показываем только при доставке
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

 async sendPaymentStatus(order: Order, amount: string) {
  this.logger.log(`📤 [TELEGRAM] Отправка сообщения об оплате для заказа ${order.id}`);
  const text = `💳 *Оплата подтверждена!*\n\nЗаказ №${order.id} оплачен онлайн.\nСумма: ${amount} ₽`;

  try {
    await this.bot.sendMessage(this.chatId, text, { parse_mode: 'Markdown' });
    this.logger.log('✔ [TELEGRAM] Уведомление отправлено');
  } catch (e) {
    this.logger.error('❌ Ошибка отправки сообщения в Telegram', e);
  }
}


}
