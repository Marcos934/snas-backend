import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
   //habilita o cors para a porta 4200
   app.enableCors({
      origin: 'http://localhost:4200',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      allowedHeaders: 'Content-Type, Accept, Authorization',
   });

  app.useGlobalPipes(new ValidationPipe({
     whitelist: true,
     transform: true,
     transformOptions: {
        enableImplicitConversion: true,
     },
  })); 
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
