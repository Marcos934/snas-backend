import { Module } from '@nestjs/common';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { RabbitmqModule } from 'src/rabbitmq/rabbitmq.module';
import { NotificationModule } from '../worker/notification/notification.module';

@Module({
  imports: [RabbitmqModule, NotificationModule],
  controllers: [GatewayController],
  providers: [GatewayService]
})
export class GatewayModule {}
