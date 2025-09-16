import { Body, Injectable, Param } from '@nestjs/common';
import { NotificationService } from 'src/worker/notification/notification.service';
import { GatewayNotificationDto } from './dto/gateway-notification.dto';
import { NotificationDto } from 'src/worker/notification/dto/notification.dto';
@Injectable()
export class GetwayService {
        constructor(
            private readonly notificationService: NotificationService
        ) { }


    async notificar(body: GatewayNotificationDto) {
       return await this.notificationService.notificar(body);
    }

    async consultaStatus(mensagemId: string) {
        return this.notificationService.consultaStatus(mensagemId);
    }


}
