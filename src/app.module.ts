import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GetwayController } from './getway/getway.controller';
import { GetwayService } from './getway/getway.service';
import { GetwayModule } from './getway/getway.module';
import { RabbitmqController } from './rabbitmq/rabbitmq.controller';
import { RabbitmqService } from './rabbitmq/rabbitmq.service';
import { RabbitmqModule } from './rabbitmq/rabbitmq.module';
import { NotificationController } from './worker/notification/notification.controller';
import { NotificationService } from './worker/notification/notification.service';
import { NotificationModule } from './worker/notification/notification.module';

@Module({
  imports: [GetwayModule, RabbitmqModule, NotificationModule],
  controllers: [AppController, GetwayController, RabbitmqController, NotificationController],
  providers: [AppService, GetwayService, RabbitmqService, NotificationService],
})
export class AppModule {}
