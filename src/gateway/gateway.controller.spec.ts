import { Test, TestingModule } from '@nestjs/testing';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { GatewayNotificationDto } from './dto/gateway-notification.dto';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('GatewayController', () => {
  let controller: GatewayController;
  let gatewayService: GatewayService;

  // Mock do GatewayService
  const mockGatewayService = {
    notificar: jest.fn(),
    consultaStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GatewayController],
      providers: [
        {
          provide: GatewayService,
          useValue: mockGatewayService,
        },
      ],
    }).compile();

    controller = module.get<GatewayController>(GatewayController);
    gatewayService = module.get<GatewayService>(GatewayService);

    // Limpar mocks antes de cada teste
    jest.clearAllMocks();
  });

  describe('Instanciação', () => {
    it('deve ser definido', () => {
      expect(controller).toBeDefined();
    });

    it('deve ter o GatewayService injetado', () => {
      expect(gatewayService).toBeDefined();
    });
  });

  describe('notificar()', () => {
    const mockNotificationDto: GatewayNotificationDto = {
      mensagemId: '123e4567-e89b-12d3-a456-426614174000',
      conteudoMensagem: 'Teste de notificação via controller',
    };

    it('deve chamar gatewayService.notificar com os dados corretos', async () => {
      const expectedResult = { success: true, id: 'test-id' };
      mockGatewayService.notificar.mockResolvedValue(expectedResult);

      const result = await controller.notificar(mockNotificationDto);

      expect(gatewayService.notificar).toHaveBeenCalledWith(mockNotificationDto);
      expect(gatewayService.notificar).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });

    it('deve retornar o resultado do gatewayService', async () => {
      const mockResult = { 
        status: 'enviado', 
        timestamp: new Date(),
        messageId: mockNotificationDto.mensagemId 
      };
      mockGatewayService.notificar.mockResolvedValue(mockResult);

      const result = await controller.notificar(mockNotificationDto);

      expect(result).toEqual(mockResult);
    });

    it('deve propagar erros do GatewayService', async () => {
      const error = new Error('Erro no gateway service');
      mockGatewayService.notificar.mockRejectedValue(error);

      await expect(controller.notificar(mockNotificationDto)).rejects.toThrow(error);
      expect(gatewayService.notificar).toHaveBeenCalledWith(mockNotificationDto);
    });

    it('deve lidar com diferentes tipos de dados no body', async () => {
      const differentDto: GatewayNotificationDto = {
        mensagemId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        conteudoMensagem: 'Mensagem com caracteres especiais: áéíóú çñü',
      };

      mockGatewayService.notificar.mockResolvedValue({ success: true });

      await controller.notificar(differentDto);

      expect(gatewayService.notificar).toHaveBeenCalledWith(differentDto);
    });
  });

  describe('getNotificar()', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    it('deve chamar gatewayService.consultaStatus com o ID correto', async () => {
      const expectedResult = { status: 'enviado', timestamp: new Date() };
      mockGatewayService.consultaStatus.mockResolvedValue(expectedResult);

      const result = await controller.getNotificar(validUuid);

      expect(gatewayService.consultaStatus).toHaveBeenCalledWith(validUuid);
      expect(gatewayService.consultaStatus).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });

    it('deve retornar o resultado da consulta de status', async () => {
      const mockStatus = {
        status: 'processando',
        timestamp: new Date(),
        attempts: 1,
      };
      mockGatewayService.consultaStatus.mockResolvedValue(mockStatus);

      const result = await controller.getNotificar(validUuid);

      expect(result).toEqual(mockStatus);
    });

    it('deve lançar HttpException quando gatewayService falha', async () => {
      const serviceError = new Error('Erro interno do serviço');
      mockGatewayService.consultaStatus.mockRejectedValue(serviceError);

      // Capturar o console.error para verificar se foi chamado
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(controller.getNotificar(validUuid)).rejects.toThrow(HttpException);
      
      try {
        await controller.getNotificar(validUuid);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(error.message).toBe('Erro interno do servidor');
      }

      expect(consoleSpy).toHaveBeenCalledWith('Erro ao consultar status:', serviceError);
      
      consoleSpy.mockRestore();
    });

    it('deve retornar null quando mensagem não existe', async () => {
      mockGatewayService.consultaStatus.mockResolvedValue(null);

      const result = await controller.getNotificar(validUuid);

      expect(result).toBeNull();
      expect(gatewayService.consultaStatus).toHaveBeenCalledWith(validUuid);
    });

    it('deve aceitar diferentes formatos de UUID válidos', async () => {
      const uuids = [
        '123e4567-e89b-12d3-a456-426614174000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      ];

      for (const uuid of uuids) {
        mockGatewayService.consultaStatus.mockResolvedValue({ status: 'ok' });
        
        await controller.getNotificar(uuid);
        
        expect(gatewayService.consultaStatus).toHaveBeenCalledWith(uuid);
      }

      expect(gatewayService.consultaStatus).toHaveBeenCalledTimes(uuids.length);
    });
  });

  describe('Integração entre endpoints', () => {
    it('deve manter consistência entre notificar e consultar status', async () => {
      const notificationDto: GatewayNotificationDto = {
        mensagemId: '123e4567-e89b-12d3-a456-426614174000',
        conteudoMensagem: 'Teste de integração entre endpoints',
      };

      // Simular notificação bem-sucedida
      mockGatewayService.notificar.mockResolvedValue({ 
        success: true, 
        messageId: notificationDto.mensagemId 
      });
      const notifyResult = await controller.notificar(notificationDto);

      // Simular consulta do status da mesma mensagem
      mockGatewayService.consultaStatus.mockResolvedValue({ 
        status: 'enviado',
        messageId: notificationDto.mensagemId 
      });
      const statusResult = await controller.getNotificar(notificationDto.mensagemId);

      expect(gatewayService.notificar).toHaveBeenCalledWith(notificationDto);
      expect(gatewayService.consultaStatus).toHaveBeenCalledWith(notificationDto.mensagemId);
      expect(notifyResult.message).toBe(statusResult.mensagemId);
    });
  });

  describe('Tratamento de erros', () => {
    it('deve propagar erros HTTP corretamente no endpoint notificar', async () => {
      const httpError = new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
      mockGatewayService.notificar.mockRejectedValue(httpError);

      const mockDto: GatewayNotificationDto = {
        mensagemId: '123e4567-e89b-12d3-a456-426614174000',
        conteudoMensagem: 'Teste de erro HTTP',
      };

      await expect(controller.notificar(mockDto)).rejects.toThrow(httpError);
    });

    it('deve converter erros genéricos em HttpException no endpoint getNotificar', async () => {
      const genericError = new Error('Erro genérico');
      mockGatewayService.consultaStatus.mockRejectedValue(genericError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(controller.getNotificar('123e4567-e89b-12d3-a456-426614174000'))
        .rejects.toThrow(HttpException);

      consoleSpy.mockRestore();
    });
  });
});
