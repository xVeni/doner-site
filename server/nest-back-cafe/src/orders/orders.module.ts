import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './orders.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { TelegramModule } from 'src/telegram_bot/telegram.module';

@Module({
  imports: [TypeOrmModule.forFeature([Order]),
            forwardRef( () =>TelegramModule),
           ],
  controllers: [OrdersController],
  providers: [OrdersService],
   exports: [OrdersService],
})
export class OrdersModule {}
