import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { RabbitmqService } from './rabbitmq.service';
import * as amqp from 'amqplib';

// Mock do módulo amqplib
jest.mock('amqplib');

describe('RabbitmqService', () => {
  let service: RabbitmqService;
  let mockConnection: jest.Mocked<amqp.Connection>;
  let mockChannel: jest.Mocked<amqp.Channel>;

  beforeEach(async () => {
    // Configurar mocks
    mockChannel = {
      assertQueue: jest.fn(),
      sendToQueue: jest.fn(),
      consume: jest.fn(),
      ack: jest.fn(),
      nack: jest.fn(),
    } as any;

    mockConnection = {
      createChannel: jest.fn().mockResolvedValue(mockChannel),
      on: jest.fn(),
    } as any;

    (amqp.connect as jest.Mock).mockResolvedValue(mockConnection);

    const module: TestingModule = await Test.createTestingModule({
      providers: [RabbitmqService],
    }).compile();

    service = module.get<RabbitmqService>(RabbitmqService);

    // Limpar todos os mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Instanciação', () => {
    it('deve ser definido', () => {
      expect(service).toBeDefined();
    });

    it('deve implementar OnModuleInit', () => {
      expect(service.onModuleInit).toBeDefined();
      expect(typeof service.onModuleInit).toBe('function');
    });
  });

  describe('onModuleInit()', () => {
    it('deve conectar ao RabbitMQ na inicialização', async () => {
      await service.onModuleInit();

      expect(amqp.connect).toHaveBeenCalledWith('amqp://admin:admin@localhost:5672');
      expect(mockConnection.createChannel).toHaveBeenCalled();
      expect(mockConnection.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockConnection.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('deve lançar HttpException quando falha ao conectar', async () => {
      const errorMessage = 'Falha na conexão';
      (amqp.connect as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(service.onModuleInit()).rejects.toThrow(HttpException);
      await expect(service.onModuleInit()).rejects.toThrow('Não foi possível conectar ao RabbitMQ: ' + errorMessage);
    });
  });

  describe('publish()', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('deve publicar mensagem na fila padrão com sucesso', async () => {
      const mensagem = { id: '123', conteudo: 'Teste' };
      const expectedPayload = Buffer.from(JSON.stringify(mensagem));

      const resultado = await service.publish(mensagem);

      expect(mockChannel.assertQueue).toHaveBeenCalledWith('fila.notificacao.entrada.MULINARI', { durable: true });
      expect(mockChannel.sendToQueue).toHaveBeenCalledWith('fila.notificacao.entrada.MULINARI', expectedPayload);
      expect(resultado).toEqual({
        statusCode: HttpStatus.ACCEPTED,
        success: true,
        message: 'Mensagem enviada para processamento com sucesso'
      });
    });

    it('deve reconectar se o canal não estiver disponível', async () => {
      // Simular canal não disponível
      (service as any).channel = null;

      const mensagem = { id: '456', conteudo: 'Teste reconexão' };
      await service.publish(mensagem);

      // Deve ter tentado conectar novamente
      expect(amqp.connect).toHaveBeenCalledTimes(2); // Uma na inicialização, outra na reconexão
    });

    it('deve lançar HttpException quando falha ao publicar', async () => {
      const errorMessage = 'Erro na fila';
      mockChannel.sendToQueue.mockRejectedValue(new Error(errorMessage));

      const mensagem = { id: '789', conteudo: 'Teste erro' };

      await expect(service.publish(mensagem)).rejects.toThrow(HttpException);
      await expect(service.publish(mensagem)).rejects.toThrow('Erro ao adicionar a fila: ' + errorMessage);
    });

    it('deve tratar diferentes tipos de mensagem', async () => {
      const mensagens = [
        { string: 'texto' },
        { numero: 123 },
        { array: [1, 2, 3] },
        { objeto: { nested: true } }
      ];

      for (const mensagem of mensagens) {
        const resultado = await service.publish(mensagem);
        expect(resultado.success).toBe(true);
      }

      expect(mockChannel.sendToQueue).toHaveBeenCalledTimes(mensagens.length);
    });
  });

  describe('publishToQueue()', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('deve publicar mensagem em fila específica com sucesso', async () => {
      const queueName = 'fila.teste.especifica';
      const mensagem = { id: '123', tipo: 'específico' };
      const expectedPayload = Buffer.from(JSON.stringify(mensagem));

      const resultado = await service.publishToQueue(queueName, mensagem);

      expect(mockChannel.assertQueue).toHaveBeenCalledWith(queueName, { durable: true });
      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(queueName, expectedPayload);
      expect(resultado).toEqual({
        success: true,
        message: `Mensagem enviada para fila ${queueName}`,
        timestamp: expect.any(String)
      });
    });

    it('deve incluir timestamp válido no resultado', async () => {
      const queueName = 'fila.timestamp';
      const mensagem = { teste: 'timestamp' };

      const resultado = await service.publishToQueue(queueName, mensagem);

      expect(resultado.timestamp).toBeDefined();
      expect(new Date(resultado.timestamp).getTime()).not.toBeNaN();
    });

    it('deve reconectar se o canal não estiver disponível', async () => {
      (service as any).channel = null;

      const queueName = 'fila.reconexao';
      const mensagem = { teste: 'reconexão' };
      
      await service.publishToQueue(queueName, mensagem);

      expect(amqp.connect).toHaveBeenCalledTimes(2);
    });

    it('deve lançar HttpException quando falha ao publicar em fila específica', async () => {
      const queueName = 'fila.erro';
      const errorMessage = 'Erro específico da fila';
      mockChannel.sendToQueue.mockRejectedValue(new Error(errorMessage));

      const mensagem = { teste: 'erro' };

      await expect(service.publishToQueue(queueName, mensagem)).rejects.toThrow(HttpException);
      await expect(service.publishToQueue(queueName, mensagem)).rejects.toThrow(`Erro ao publicar na fila ${queueName}: ${errorMessage}`);
    });
  });

  describe('consume()', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('deve consumir mensagens da fila com sucesso', async () => {
      const queueName = 'fila.consumo';
      const callback = jest.fn();
      const mensagemMock = {
        content: Buffer.from(JSON.stringify({ id: '123', dados: 'teste' }))
      };

      // Simular o comportamento do consume
      mockChannel.consume.mockImplementation(async (queue, handler) => {
        if (handler) {
          handler(mensagemMock as any);
        }
      });

      await service.consume(queueName, callback);

      expect(mockChannel.assertQueue).toHaveBeenCalledWith(queueName, { durable: true });
      expect(mockChannel.consume).toHaveBeenCalledWith(queueName, expect.any(Function));
      expect(callback).toHaveBeenCalledWith({ id: '123', dados: 'teste' });
      expect(mockChannel.ack).toHaveBeenCalledWith(mensagemMock);
    });

    it('deve fazer nack de mensagens malformadas', async () => {
      const queueName = 'fila.malformada';
      const callback = jest.fn();
      const mensagemMalformada = {
        content: Buffer.from('json inválido {')
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockChannel.consume.mockImplementation(async (queue, handler) => {
        if (handler) {
          handler(mensagemMalformada as any);
        }
      });

      await service.consume(queueName, callback);

      expect(callback).not.toHaveBeenCalled();
      expect(mockChannel.nack).toHaveBeenCalledWith(mensagemMalformada, false, false);
      expect(consoleSpy).toHaveBeenCalledWith('Erro ao fazer parse da mensagem:', expect.any(SyntaxError));

      consoleSpy.mockRestore();
    });

    it('deve reconectar se o canal não estiver disponível', async () => {
      (service as any).channel = null;

      const queueName = 'fila.reconexao.consume';
      const callback = jest.fn();

      await service.consume(queueName, callback);

      expect(amqp.connect).toHaveBeenCalledTimes(2);
    });

    it('deve lançar HttpException quando falha ao consumir', async () => {
      const queueName = 'fila.erro.consume';
      const errorMessage = 'Erro no consumo';
      const callback = jest.fn();

      mockChannel.consume.mockRejectedValue(new Error(errorMessage));

      await expect(service.consume(queueName, callback)).rejects.toThrow(HttpException);
      await expect(service.consume(queueName, callback)).rejects.toThrow('Erro ao consumir a fila: ' + errorMessage);
    });

    it('deve ignorar mensagens nulas', async () => {
      const queueName = 'fila.nula';
      const callback = jest.fn();

      mockChannel.consume.mockImplementation(async (queue, handler) => {
        if (handler) {
          handler(null);
        }
      });

      await service.consume(queueName, callback);

      expect(callback).not.toHaveBeenCalled();
      expect(mockChannel.ack).not.toHaveBeenCalled();
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });
  });

  describe('Integração entre métodos', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('deve manter consistência entre publish e publishToQueue', async () => {
      const mensagem = { id: 'integração', dados: 'teste' };

      // Publicar na fila padrão
      const resultado1 = await service.publish(mensagem);
      
      // Publicar na fila específica
      const resultado2 = await service.publishToQueue('fila.especifica', mensagem);

      expect(resultado1.success).toBe(true);
      expect(resultado2.success).toBe(true);
      expect(mockChannel.sendToQueue).toHaveBeenCalledTimes(2);
    });

    it('deve funcionar com fluxo completo publish -> consume', async () => {
      const queueName = 'fila.completa';
      const mensagem = { id: 'fluxo', dados: 'completo' };
      const callback = jest.fn();

      // Simular mensagem sendo consumida após publicação
      mockChannel.consume.mockImplementation(async (queue, handler) => {
        if (handler) {
          const mensagemMock = {
            content: Buffer.from(JSON.stringify(mensagem))
          };
          handler(mensagemMock as any);
        }
      });

      // Publicar mensagem
      await service.publishToQueue(queueName, mensagem);
      
      // Consumir mensagem
      await service.consume(queueName, callback);

      expect(callback).toHaveBeenCalledWith(mensagem);
      expect(mockChannel.ack).toHaveBeenCalled();
    });
  });

  describe('Tratamento de erros de conexão', () => {
    it('deve configurar listeners de erro e reconexão', async () => {
      await service.onModuleInit();

      expect(mockConnection.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockConnection.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('deve logar erros de conexão', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await service.onModuleInit();

      // Simular erro de conexão
      const errorHandler = mockConnection.on.mock.calls.find(call => call[0] === 'error')?.[1];
      if (errorHandler) {
        errorHandler(new Error('Erro de conexão simulado'));
      }

      expect(consoleSpy).toHaveBeenCalledWith('Erro de conexão RabbitMQ:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('deve tentar reconectar quando conexão é fechada', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      jest.useFakeTimers();
      
      await service.onModuleInit();

      // Simular fechamento de conexão
      const closeHandler = mockConnection.on.mock.calls.find(call => call[0] === 'close')?.[1];
      if (closeHandler) {
        closeHandler();
      }

      expect(consoleSpy).toHaveBeenCalledWith('Conexão RabbitMQ fechada, tentando reconectar...');
      
      // Avançar timer para simular reconexão
      jest.advanceTimersByTime(5000);
      
      jest.useRealTimers();
      consoleSpy.mockRestore();
    });
  });
});
