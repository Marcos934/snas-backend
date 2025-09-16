import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GatewayModule } from './gateway/gateway.module';
import { RabbitmqModule } from './rabbitmq/rabbitmq.module';
import { NotificationModule } from './worker/notification/notification.module';

@Module({
  imports: [GatewayModule, RabbitmqModule, NotificationModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
