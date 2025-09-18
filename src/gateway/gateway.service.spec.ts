import { Test, TestingModule } from '@nestjs/testing';
import { GatewayService } from './gateway.service';
import { NotificationService } from '../worker/notification/notification.service';
import { GatewayNotificationDto } from './dto/gateway-notification.dto';

describe('GatewayService', () => {
  let service: GatewayService;
  let notificationService: NotificationService;

  // Mock do NotificationService
  const mockNotificationService = {
    notificar: jest.fn(),
    consultaStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GatewayService,
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    service = module.get<GatewayService>(GatewayService);
    notificationService = module.get<NotificationService>(NotificationService);

    // Limpar mocks antes de cada teste
    jest.clearAllMocks();
  });

  describe('Instanciação', () => {
    it('deve ser definido', () => {
      expect(service).toBeDefined();
    });

    it('deve ter o NotificationService injetado', () => {
      expect(notificationService).toBeDefined();
    });
  });

  describe('notificar()', () => {
    const mockNotificationDto: GatewayNotificationDto = {
      mensagemId: '123e4567-e89b-12d3-a456-426614174000',
      conteudoMensagem: 'Teste de notificação',
    };

    it('deve chamar notificationService.notificar com os dados corretos', async () => {
      const expectedResult = { success: true, id: 'test-id' };
      mockNotificationService.notificar.mockResolvedValue(expectedResult);

      const result = await service.notificar(mockNotificationDto);

      expect(notificationService.notificar).toHaveBeenCalledWith(mockNotificationDto);
      expect(notificationService.notificar).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });

    it('deve propagar erros do NotificationService', async () => {
      const error = new Error('Erro no serviço de notificação');
      mockNotificationService.notificar.mockRejectedValue(error);

      await expect(service.notificar(mockNotificationDto)).rejects.toThrow(error);
      expect(notificationService.notificar).toHaveBeenCalledWith(mockNotificationDto);
    });

    it('deve retornar undefined quando NotificationService retorna undefined', async () => {
      mockNotificationService.notificar.mockResolvedValue(undefined);

      const result = await service.notificar(mockNotificationDto);

      expect(result).toBeUndefined();
      expect(notificationService.notificar).toHaveBeenCalledWith(mockNotificationDto);
    });
  });

  describe('consultaStatus()', () => {
    const mensagemId = '123e4567-e89b-12d3-a456-426614174000';

    it('deve chamar notificationService.consultaStatus com o ID correto', async () => {
      const expectedResult = { status: 'enviado', timestamp: new Date() };
      mockNotificationService.consultaStatus.mockResolvedValue(expectedResult);

      const result = await service.consultaStatus(mensagemId);

      expect(notificationService.consultaStatus).toHaveBeenCalledWith(mensagemId);
      expect(notificationService.consultaStatus).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });

    it('deve propagar erros do NotificationService na consulta', async () => {
      const error = new Error('Mensagem não encontrada');
      mockNotificationService.consultaStatus.mockRejectedValue(error);

      await expect(service.consultaStatus(mensagemId)).rejects.toThrow(error);
      expect(notificationService.consultaStatus).toHaveBeenCalledWith(mensagemId);
    });

    it('deve retornar null quando mensagem não existe', async () => {
      mockNotificationService.consultaStatus.mockResolvedValue(null);

      const result = await service.consultaStatus(mensagemId);

      expect(result).toBeNull();
      expect(notificationService.consultaStatus).toHaveBeenCalledWith(mensagemId);
    });

    it('deve aceitar diferentes formatos de UUID válidos', async () => {
      const uuids = [
        '123e4567-e89b-12d3-a456-426614174000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      ];

      for (const uuid of uuids) {
        mockNotificationService.consultaStatus.mockResolvedValue({ status: 'ok' });
        
        await service.consultaStatus(uuid);
        
        expect(notificationService.consultaStatus).toHaveBeenCalledWith(uuid);
      }

      expect(notificationService.consultaStatus).toHaveBeenCalledTimes(uuids.length);
    });
  });

  describe('Integração entre métodos', () => {
    it('deve manter consistência entre notificar e consultaStatus', async () => {
      const notificationDto: GatewayNotificationDto = {
        mensagemId: '123e4567-e89b-12d3-a456-426614174000',
        conteudoMensagem: 'Teste de integração',
      };

      // Simular notificação bem-sucedida
      mockNotificationService.notificar.mockResolvedValue({ success: true });
      await service.notificar(notificationDto);

      // Simular consulta do status da mesma mensagem
      mockNotificationService.consultaStatus.mockResolvedValue({ status: 'enviado' });
      const status = await service.consultaStatus(notificationDto.mensagemId);

      expect(notificationService.notificar).toHaveBeenCalledWith(notificationDto);
      expect(notificationService.consultaStatus).toHaveBeenCalledWith(notificationDto.mensagemId);
      expect(status).toEqual({ status: 'enviado' });
    });
  });
});
