import { Controller, Post, Param, Body, Get, HttpException, HttpStatus } from '@nestjs/common';
import { GetwayService } from './getway.service';
import { GatewayNotificationDto } from './dto/gateway-notification.dto';

@Controller("api")
export class GetwayController {
    constructor(
        private readonly getservice: GetwayService,
    ) { }

    // enviar msg para o rabbitmq
    @Post("notificar")
    async notificar(@Body() body: GatewayNotificationDto) {
        try {
            const result = await this.getservice.notificar(body);
            return result;
        } catch (error) {
            throw error;
        }
    }

    @Get("notificar/status/:id")
    getNotificar(@Param("id") id: string) {
       return "Rota teste " + id;
    }
    

}
