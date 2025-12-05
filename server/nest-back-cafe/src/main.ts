import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Разрешаем CORS
  app.enableCors({ origin: '*' });


  // Валидация входящих данных
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,             // удаляет лишние поля
      forbidNonWhitelisted: false, // не ругается на лишние поля
      transform: true,             // превращает payload в классы DTO
    }),
  );

    app.use(
    '/payments/webhook', 
    bodyParser.raw({ type: 'application/json' })
  );

  // Слушаем все интерфейсы на порту 3000
  await app.listen(3000, '0.0.0.0');
  console.log(`Server running at http://0.0.0.0:3000`);
}

bootstrap();
