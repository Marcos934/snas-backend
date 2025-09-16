import { Module } from '@nestjs/common';
import { RabbitmqService } from './rabbitmq.service';

@Module({
  controllers: [],
  providers: [RabbitmqService]
})
export class RabbitmqModule {}
