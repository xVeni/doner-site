import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: '*' });
  await app.listen( 3000, '0.0.0.0');
  app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,            // удаляет лишние поля
    forbidNonWhitelisted: false, // ругается на лишние поля
    transform: true,            // превращает payload в классы DTO
  }),
);

}
bootstrap();