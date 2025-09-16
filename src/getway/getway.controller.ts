import { Controller, Post, Param, Body, Get, HttpException, HttpStatus, ParseUUIDPipe, HttpCode } from '@nestjs/common';
import { GetwayService } from './getway.service';
import { GatewayNotificationDto } from './dto/gateway-notification.dto';

@Controller("api")
export class GetwayController {
    constructor(
        private readonly getservice: GetwayService,
    ) { }

    //new GatewayNotificationDto
    private notificationDto = new GatewayNotificationDto();

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

   // Consultar status da mensagem - agora com validação de UUID
    @Get("notificar/status/:id")
    async getNotificar(@Param("id", ParseUUIDPipe) id: string) {
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
