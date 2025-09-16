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
    async getNotificar(@Param("id") id: string) {
        try {
            const result = await this.getservice.consultaStatus(id);
            return result;
        } catch (error) {
            console.error('Erro ao consultar status:', error);
            throw new HttpException(
                'Erro interno do servidor',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
    

}
