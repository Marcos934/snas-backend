import { Module } from '@nestjs/common';
import { GetwayController } from './getway.controller';
import { GetwayService } from './getway.service';
import { RabbitmqModule } from 'src/rabbitmq/rabbitmq.module';
import { NotificationModule } from '../worker/notification/notification.module';

@Module({
  imports: [RabbitmqModule, NotificationModule],
  controllers: [GetwayController],
  providers: [GetwayService]
})
export class GetwayModule {}
