import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { RabbitmqModule } from 'src/rabbitmq/rabbitmq.module';
import { RabbitmqService } from 'src/rabbitmq/rabbitmq.service';

@Module({
  imports: [RabbitmqModule,],
  controllers: [],
  providers: [NotificationService, RabbitmqService],
  exports: [NotificationService]
})
export class NotificationModule {}
