import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GetwayModule } from './getway/getway.module';
import { RabbitmqModule } from './rabbitmq/rabbitmq.module';
import { NotificationModule } from './worker/notification/notification.module';

@Module({
  imports: [GetwayModule, RabbitmqModule, NotificationModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
