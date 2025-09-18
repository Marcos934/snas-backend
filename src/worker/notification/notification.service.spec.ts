import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { RabbitmqService } from '../../rabbitmq/rabbitmq.service';
import { NotificationDto } from './dto/notification.dto';

describe('NotificationService', () => {
  let service: NotificationService;
  let rabbitmqService: RabbitmqService;

  // Mock do RabbitmqService
  const mockRabbitmqService = {
    publish: jest.fn(),
    publishToQueue: jest.fn(),
    consume: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: RabbitmqService,
          useValue: mockRabbitmqService,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    rabbitmqService = module.get<RabbitmqService>(RabbitmqService);

    // Limpar mocks antes de cada teste
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Limpar o Map de status entre testes
    (service as any).statusMensagens.clear();
  });

  describe('Instanciação', () => {
    it('deve ser definido', () => {
      expect(service).toBeDefined();
    });

    it('deve implementar OnModuleInit', () => {
      expect(service.onModuleInit).toBeDefined();
      expect(typeof service.onModuleInit).toBe('function');
    });

    it('deve ter o RabbitmqService injetado', () => {
      expect(rabbitmqService).toBeDefined();
    });

    it('deve inicializar o Map de status das mensagens', () => {
      const statusMensagens = (service as any).statusMensagens;
      expect(statusMensagens).toBeInstanceOf(Map);
      expect(statusMensagens.size).toBe(0);
    });
  });

  describe('onModuleInit()', () => {
    it('deve inicializar o consumer de notificações', async () => {
      await service.onModuleInit();

      expect(rabbitmqService.consume).toHaveBeenCalledWith(
        'fila.notificacao.entrada.MULINARI',
        expect.any(Function)
      );
      expect(rabbitmqService.consume).toHaveBeenCalledTimes(1);
    });

    it('deve configurar o callback do consumer corretamente', async () => {
      let consumerCallback: Function;

      mockRabbitmqService.consume.mockImplementation((queue, callback) => {
        consumerCallback = callback;
        return Promise.resolve();
      });

      await service.onModuleInit();

      expect(consumerCallback).toBeDefined();
      expect(typeof consumerCallback).toBe('function');
    });
  });

  describe('notificar()', () => {
    const mockNotificationDto: NotificationDto = {
      mensagemId: '123e4567-e89b-12d3-a456-426614174000',
      conteudoMensagem: 'Teste de notificação',
      id: 'optional-id',
    };

    it('deve chamar rabbitmqService.publish com os dados corretos', async () => {
      const expectedResult = { success: true, statusCode: 202 };
      mockRabbitmqService.publish.mockResolvedValue(expectedResult);

      const result = await service.notificar(mockNotificationDto);

      expect(rabbitmqService.publish).toHaveBeenCalledWith(mockNotificationDto);
      expect(rabbitmqService.publish).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });

    it('deve propagar erros do RabbitmqService', async () => {
      const error = new Error('Erro na publicação');
      mockRabbitmqService.publish.mockRejectedValue(error);

      await expect(service.notificar(mockNotificationDto)).rejects.toThrow(error);
      expect(rabbitmqService.publish).toHaveBeenCalledWith(mockNotificationDto);
    });

    it('deve funcionar com NotificationDto sem campo id opcional', async () => {
      const dtoSemId: NotificationDto = {
        mensagemId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        conteudoMensagem: 'Mensagem sem ID opcional',
      };

      mockRabbitmqService.publish.mockResolvedValue({ success: true });

      await service.notificar(dtoSemId);

      expect(rabbitmqService.publish).toHaveBeenCalledWith(dtoSemId);
    });

    it('deve retornar undefined quando RabbitmqService retorna undefined', async () => {
      mockRabbitmqService.publish.mockResolvedValue(undefined);

      const result = await service.notificar(mockNotificationDto);

      expect(result).toBeUndefined();
    });
  });

  describe('consultaStatus()', () => {
    const mensagemId = '123e4567-e89b-12d3-a456-426614174000';

    beforeEach(() => {
      // Spy no console.log para verificar logs
      jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      (console.log as jest.Mock).mockRestore();
    });

    it('deve retornar NAO_ENCONTRADO quando mensagem não existe', async () => {
      const result = await service.consultaStatus(mensagemId);

      expect(result).toEqual({
        mensagemId,
        status: 'NAO_ENCONTRADO',
        message: 'Mensagem não encontrada ou ainda não processada'
      });
      expect(console.log).toHaveBeenCalledWith('Consultando status para:', mensagemId);
    });

    it('deve retornar status quando mensagem existe', async () => {
      // Adicionar status manualmente ao Map
      const statusMensagens = (service as any).statusMensagens;
      statusMensagens.set(mensagemId, 'PROCESSADO_SUCESSO');

      const result = await service.consultaStatus(mensagemId);

      expect(result).toEqual({
        mensagemId,
        status: 'PROCESSADO_SUCESSO',
        timestamp: expect.any(String)
      });
      expect(new Date(result.timestamp).getTime()).not.toBeNaN();
    });

    it('deve funcionar com diferentes status de processamento', async () => {
      const statusMensagens = (service as any).statusMensagens;
      const statusList = ['PROCESSADO_SUCESSO', 'FALHA_PROCESSAMENTO', 'ERRO_PROCESSAMENTO'];

      for (let i = 0; i < statusList.length; i++) {
        const id = `mensagem-${i}`;
        const status = statusList[i];
        
        statusMensagens.set(id, status);
        
        const result = await service.consultaStatus(id);
        
        expect(result.status).toBe(status);
        expect(result.mensagemId).toBe(id);
      }
    });

    it('deve incluir timestamp válido no resultado', async () => {
      const statusMensagens = (service as any).statusMensagens;
      statusMensagens.set(mensagemId, 'PROCESSADO_SUCESSO');

      const result = await service.consultaStatus(mensagemId);

      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
      expect(new Date(result.timestamp).getTime()).not.toBeNaN();
    });

    it('deve logar a consulta de status', async () => {
      await service.consultaStatus(mensagemId);

      expect(console.log).toHaveBeenCalledWith('Consultando status para:', mensagemId);
    });
  });

  describe('processarMensagem() - Método Privado', () => {
    let consumerCallback: Function;

    beforeEach(async () => {
      // Capturar o callback do consumer
      mockRabbitmqService.consume.mockImplementation((queue, callback) => {
        consumerCallback = callback;
        return Promise.resolve();
      });

      await service.onModuleInit();

      // Mock do setTimeout para acelerar os testes
      jest.useFakeTimers();
      
      // Spy nos console.error
      jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      jest.useRealTimers();
      (console.error as jest.Mock).mockRestore();
    });

    it('deve processar mensagem com sucesso', async () => {
      const mensagem = {
        mensagemId: '123e4567-e89b-12d3-a456-426614174000',
        conteudoMensagem: 'Teste de processamento'
      };

      // Mock Math.random para garantir sucesso (> 0.2)
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      // Executar o callback do consumer
      const processPromise = consumerCallback(mensagem);

      // Avançar os timers para simular o delay
      jest.advanceTimersByTime(4000);

      await processPromise;

      // Verificar se o status foi definido
      const statusMensagens = (service as any).statusMensagens;
      expect(statusMensagens.get(mensagem.mensagemId)).toBe('PROCESSADO_SUCESSO');

      // Verificar se publicou o status
      expect(rabbitmqService.publishToQueue).toHaveBeenCalledWith(
        'fila.notificacao.status.MULINARI',
        {
          mensagemId: mensagem.mensagemId,
          status: 'PROCESSADO_SUCESSO',
          timestamp: expect.any(String)
        }
      );

      (Math.random as jest.Mock).mockRestore();
    });

    it('deve processar mensagem com falha simulada', async () => {
      const mensagem = {
        mensagemId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        conteudoMensagem: 'Teste de falha'
      };

      // Mock Math.random para garantir falha (<= 0.2)
      jest.spyOn(Math, 'random').mockReturnValue(0.1);

      const processPromise = consumerCallback(mensagem);
      jest.advanceTimersByTime(4000);
      await processPromise;

      const statusMensagens = (service as any).statusMensagens;
      expect(statusMensagens.get(mensagem.mensagemId)).toBe('FALHA_PROCESSAMENTO');

      expect(rabbitmqService.publishToQueue).toHaveBeenCalledWith(
        'fila.notificacao.status.MULINARI',
        {
          mensagemId: mensagem.mensagemId,
          status: 'FALHA_PROCESSAMENTO',
          timestamp: expect.any(String)
        }
      );

      (Math.random as jest.Mock).mockRestore();
    });

    it('deve tratar erros durante o processamento', async () => {
      const mensagem = {
        mensagemId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        conteudoMensagem: 'Teste de erro'
      };

      // Mock Math.random para garantir sucesso no processamento
      jest.spyOn(Math, 'random').mockReturnValue(0.8);

      // Simular erro no setTimeout para forçar o catch
      const originalSetTimeout = global.setTimeout;
      jest.spyOn(global, 'setTimeout').mockImplementation((callback, delay) => {
        // Simular erro durante o processamento
        throw new Error('Erro simulado durante processamento');
      });

      const processPromise = consumerCallback(mensagem);
      jest.advanceTimersByTime(4000);
      await processPromise;

      const statusMensagens = (service as any).statusMensagens;
      expect(statusMensagens.get(mensagem.mensagemId)).toBe('ERRO_PROCESSAMENTO');

      expect(console.error).toHaveBeenCalledWith(
        `Erro ao processar mensagem ${mensagem.mensagemId}:`,
        expect.any(Error)
      );

      // Restaurar mocks
      (Math.random as jest.Mock).mockRestore();
      (global.setTimeout as jest.Mock).mockRestore();
    });

    it('deve usar delay aleatório no processamento', async () => {
      const mensagem = {
        mensagemId: 'delay-test',
        conteudoMensagem: 'Teste de delay'
      };

      // Mock Math.random para valores específicos
      jest.spyOn(Math, 'random')
        .mockReturnValueOnce(0.5) // Para o delay (500ms adicional)
        .mockReturnValueOnce(0.8); // Para o sucesso

      const processPromise = consumerCallback(mensagem);

      // Avançar apenas 3000ms (delay base)
      jest.advanceTimersByTime(3000);
      
      // Verificar que ainda não processou
      const statusMensagens = (service as any).statusMensagens;
      expect(statusMensagens.has(mensagem.mensagemId)).toBe(false);

      // Avançar mais 500ms (delay aleatório)
      jest.advanceTimersByTime(500);
      await processPromise;

      // Agora deve ter processado
      expect(statusMensagens.get(mensagem.mensagemId)).toBe('PROCESSADO_SUCESSO');

      (Math.random as jest.Mock).mockRestore();
    });
  });

  describe('publicarStatusProcessamento() - Método Privado', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      (console.error as jest.Mock).mockRestore();
    });

    it('deve publicar status com sucesso', async () => {
      const mensagemId = 'test-status-id';
      const status = 'PROCESSADO_SUCESSO';

      // Chamar método privado através de reflexão
      await (service as any).publicarStatusProcessamento(mensagemId, status);

      expect(rabbitmqService.publishToQueue).toHaveBeenCalledWith(
        'fila.notificacao.status.MULINARI',
        {
          mensagemId,
          status,
          timestamp: expect.any(String)
        }
      );
    });

    it('deve tratar erros na publicação do status', async () => {
      const mensagemId = 'error-status-id';
      const status = 'ERRO_PROCESSAMENTO';
      const error = new Error('Erro na fila de status');

      mockRabbitmqService.publishToQueue.mockRejectedValue(error);

      await (service as any).publicarStatusProcessamento(mensagemId, status);

      expect(console.error).toHaveBeenCalledWith('Erro:', error);
    });

    it('deve incluir timestamp válido na mensagem de status', async () => {
      const mensagemId = 'timestamp-test';
      const status = 'PROCESSADO_SUCESSO';

      await (service as any).publicarStatusProcessamento(mensagemId, status);

      const publishCall = mockRabbitmqService.publishToQueue.mock.calls[0];
      const statusMessage = publishCall[1];

      expect(statusMessage.timestamp).toBeDefined();
      expect(new Date(statusMessage.timestamp).getTime()).not.toBeNaN();
    });
  });

  describe('Integração entre métodos', () => {
    it('deve manter consistência entre notificar e consultaStatus', async () => {
      const notificationDto: NotificationDto = {
        mensagemId: '123e4567-e89b-12d3-a456-426614174000',
        conteudoMensagem: 'Teste de integração',
      };

      // Simular notificação bem-sucedida
      mockRabbitmqService.publish.mockResolvedValue({ success: true });
      await service.notificar(notificationDto);

      // Simular processamento da mensagem (adicionar status manualmente)
      const statusMensagens = (service as any).statusMensagens;
      statusMensagens.set(notificationDto.mensagemId, 'PROCESSADO_SUCESSO');

      // Consultar status
      const status = await service.consultaStatus(notificationDto.mensagemId);

      expect(rabbitmqService.publish).toHaveBeenCalledWith(notificationDto);
      expect(status).toEqual({
        mensagemId: notificationDto.mensagemId,
        status: 'PROCESSADO_SUCESSO',
        timestamp: expect.any(String)
      });
    });

    it('deve funcionar com fluxo completo notificar -> processar -> consultar', async () => {
      jest.useFakeTimers();
      jest.spyOn(Math, 'random').mockReturnValue(0.8); // Garantir sucesso

      const notificationDto: NotificationDto = {
        mensagemId: 'fluxo-completo',
        conteudoMensagem: 'Teste de fluxo completo',
      };

      // Capturar callback do consumer
      let consumerCallback: Function;
      mockRabbitmqService.consume.mockImplementation((queue, callback) => {
        consumerCallback = callback;
        return Promise.resolve();
      });

      // Inicializar serviço
      await service.onModuleInit();

      // 1. Notificar
      mockRabbitmqService.publish.mockResolvedValue({ success: true });
      const notifyResult = await service.notificar(notificationDto);

      // 2. Simular processamento
      const processPromise = consumerCallback(notificationDto);
      jest.advanceTimersByTime(4000);
      await processPromise;

      // 3. Consultar status
      const statusResult = await service.consultaStatus(notificationDto.mensagemId);

      expect(notifyResult.success).toBe(true);
      expect(statusResult.status).toBe('PROCESSADO_SUCESSO');
      expect(statusResult.mensagemId).toBe(notificationDto.mensagemId);

      jest.useRealTimers();
      (Math.random as jest.Mock).mockRestore();
    });
  });

  describe('Gerenciamento de estado interno', () => {
    it('deve manter múltiplos status de mensagens simultaneamente', async () => {
      const mensagens = [
        { id: 'msg-1', status: 'PROCESSADO_SUCESSO' },
        { id: 'msg-2', status: 'FALHA_PROCESSAMENTO' },
        { id: 'msg-3', status: 'ERRO_PROCESSAMENTO' },
      ];

      const statusMensagens = (service as any).statusMensagens;

      // Adicionar múltiplos status
      mensagens.forEach(msg => {
        statusMensagens.set(msg.id, msg.status);
      });

      // Verificar todos os status
      for (const msg of mensagens) {
        const result = await service.consultaStatus(msg.id);
        expect(result.status).toBe(msg.status);
        expect(result.mensagemId).toBe(msg.id);
      }

      expect(statusMensagens.size).toBe(mensagens.length);
    });

    it('deve permitir atualização de status de mensagem existente', async () => {
      const mensagemId = 'update-test';
      const statusMensagens = (service as any).statusMensagens;

      // Status inicial
      statusMensagens.set(mensagemId, 'PROCESSANDO');
      let result = await service.consultaStatus(mensagemId);
      expect(result.status).toBe('PROCESSANDO');

      // Atualizar status
      statusMensagens.set(mensagemId, 'PROCESSADO_SUCESSO');
      result = await service.consultaStatus(mensagemId);
      expect(result.status).toBe('PROCESSADO_SUCESSO');

      expect(statusMensagens.size).toBe(1);
    });
  });
});
