import { Body, Injectable, OnModuleInit } from '@nestjs/common';
import { RabbitmqService } from 'src/rabbitmq/rabbitmq.service';
import { NotificationDto } from './dto/notification.dto';

@Injectable()
export class NotificationService implements OnModuleInit {
    // Map para armazenar status das mensagens em memória
    private statusMensagens = new Map<string, string>();
    
    constructor(
        private readonly rabbitmqService: RabbitmqService,
    ) { }

   
    // Inicializa o consumer
    async onModuleInit() {
        await this.iniciarConsumerNotificacoes();
    }

    /**
     * Publica uma mensagem na fila de entrada para processamento
     */
    async notificar(body: NotificationDto) {
        return await this.rabbitmqService.publish(body);
    }

    
    // Consulta o status por mensagemId
    async consultaStatus(mensagemId: string) {
        console.log('Consultando status para:', mensagemId);
        
        const status = this.statusMensagens.get(mensagemId);
        
        if (!status) {
            return {
                mensagemId,
                status: 'NAO_ENCONTRADO',
                message: 'Mensagem não encontrada ou ainda não processada'
            };
        }

        return {
            mensagemId,
            status,
            timestamp: new Date().toISOString()
        };
    }

    // Aqui faz o consumo da fila
    private async iniciarConsumerNotificacoes() {
        const filaEntrada = 'fila.notificacao.entrada.MULINARI';
        await this.rabbitmqService.consume(filaEntrada, async (message) => {
            await this.processarMensagem(message);
        });
    }

    // Processa uma mensagem individual e Simula processamento real com delay e chance de falha
    // Já implementado corretamente
    private async processarMensagem(conteudo: any) {
        const { mensagemId, conteudoMensagem } = conteudo;
        
        try {
            // Simulação de processamento 3 segundos
            await new Promise((resolve) =>
                setTimeout(resolve, 3000 + Math.random() * 1000)
            );
            
            const sucesso = Math.floor(Math.random() * 10) > 2;
            const status = sucesso ? 'PROCESSADO_SUCESSO' : 'FALHA_PROCESSAMENTO';
            
            this.statusMensagens.set(mensagemId, status);
            await this.publicarStatusProcessamento(mensagemId, status);
            
        } catch (error) {
            console.error(`Erro ao processar mensagem ${mensagemId}:`, error);
            this.statusMensagens.set(mensagemId, 'ERRO_PROCESSAMENTO');
            await this.publicarStatusProcessamento(mensagemId, 'ERRO_PROCESSAMENTO');
        }
    }


    private async publicarStatusProcessamento(mensagemId: string, status: string) {
        try {
            const filaStatus = 'fila.notificacao.status.MULINARI';
            const statusMessage = {
                mensagemId,
                status,
                timestamp: new Date().toISOString()
            };

            await this.rabbitmqService.publishToQueue(filaStatus, statusMessage);
            
        } catch (error) {
            console.error('Erro:', error);
        }
    }
}
