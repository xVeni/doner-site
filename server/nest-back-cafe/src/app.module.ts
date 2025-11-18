import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Dish } from './dishes/dishes.entity';
import { Order } from './orders/orders.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { DishesModule } from './dishes/dishes.module';
import { OrdersModule } from './orders/orders.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { TelegramModule } from './telegram_bot/telegram.module';

console.log('STATIC PATH:', join(__dirname, '..', 'uploads'));
@Module({
  imports: [
    ConfigModule.forRoot({isGlobal: true}), //Модкль для использований переменных окружения isGlobal - отвечает за то что модуль доступен всему приложению
    TypeOrmModule.forRoot({
    
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'), //Нужно пофиксить проверко что все перменные окружения заданы
      username: process.env.DB_USER,
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME,
      entities: [Dish, Order],
      synchronize: true, //todo: Во время продакшена нужно отключить 

    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'BD_PHOTO'),
      serveRoot: '/images'
    }),
    DishesModule,
    OrdersModule,
    TelegramModule
  ],
  
})
export class AppModule {
  
}
