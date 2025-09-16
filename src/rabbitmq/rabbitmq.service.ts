import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

import { OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitmqService implements OnModuleInit {
    private connection: amqp.Connection;
    private channel: amqp.Channel;
    private nomeFila = 'fila.notificacao.entrada.MULINARI';


    async onModuleInit() {
        await this.connect();
    }

    private async connect() {
        try {
            this.connection = await amqp.connect('amqp://admin:admin@localhost:5672');
            this.channel = await this.connection.createChannel();
            
            // Adicionar listeners para reconexão
            this.connection.on('error', (err) => {
                console.error('Erro de conexão RabbitMQ:', err);
            });
            
            this.connection.on('close', () => {
                console.log('Conexão RabbitMQ fechada, tentando reconectar...');
                setTimeout(() => this.connect(), 5000);
            });
            
        } catch (error) {
            console.error('Falha ao conectar com RabbitMQ:', error);
            throw new HttpException(
                'Não foi possível conectar ao RabbitMQ: ' + error.message,
                HttpStatus.SERVICE_UNAVAILABLE
            );
        }
    }

    //Publica mensagem na fila padrão
    async publish(message: any) {
        try {
            if (!this.channel) {
                await this.connect();
            }
            const payload = Buffer.from(JSON.stringify(message));
            await this.channel.assertQueue(this.nomeFila, { durable: true });
            await this.channel.sendToQueue(this.nomeFila, payload);
            
            return {
                statusCode: HttpStatus.ACCEPTED,
                success: true,
                message: 'Mensagem enviada para processamento com sucesso'
            };
        } catch (error) {
            throw new HttpException('Erro ao adicionar a fila: ' + error.message, 500);
        }
    }



    //Publica mensagem em uma fila específica
    async publishToQueue(queueName: string, message: any) {
        try {
            if (!this.channel) {
                await this.connect();
            }

            const payload = Buffer.from(JSON.stringify(message));
            await this.channel.assertQueue(queueName, { durable: true });
            await this.channel.sendToQueue(queueName, payload);
            
            return {
                success: true,
                message: `Mensagem enviada para fila ${queueName}`,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            throw new HttpException(`Erro ao publicar na fila ${queueName}: ` + error.message, 500);
        }
    }

    //consumer 
    async consume(queue: string, callback: (message: any) => void) {
        try {
            if (!this.channel) {
                await this.connect();
            }
            
            await this.channel.assertQueue(queue, { durable: true });
            await this.channel.consume(queue, (message) => {
                if (message) {
                    try {
                        // Try-catch interno para parsing
                        const parsedMessage = JSON.parse(message.content.toString());
                        callback(parsedMessage);
                        this.channel.ack(message);
                    } catch (parseError) {
                        console.error('Erro ao fazer parse da mensagem:', parseError);
                        // Rejeitar mensagem malformada
                        this.channel.nack(message, false, false);
                    }
                }
            });
        } catch (error) {
            throw new HttpException('Erro ao consumir a fila: ' + error.message, 500);
        }
    }
  
}
