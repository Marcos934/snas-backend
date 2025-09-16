import { Controller, Post, Param, Body, Get, HttpException, HttpStatus, ParseUUIDPipe, HttpCode } from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { GatewayNotificationDto } from './dto/gateway-notification.dto';

@Controller("api")
export class GatewayController {
    constructor(
        private readonly gatewayService: GatewayService,
    ) { }

    //new GatewayNotificationDto
    private notificationDto = new GatewayNotificationDto();

    // enviar msg para o rabbitmq
    @Post("notificar")
    async notificar(@Body() body: GatewayNotificationDto) {
        try {
            const result = await this.gatewayService.notificar(body);
            return result;
        } catch (error) {
            throw error;
        }
    }

   // Consultar status da mensagem - agora com validação de UUID
    @Get("notificar/status/:id")
    async getNotificar(@Param("id", ParseUUIDPipe) id: string) {
        try {
            const result = await this.gatewayService.consultaStatus(id);
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
