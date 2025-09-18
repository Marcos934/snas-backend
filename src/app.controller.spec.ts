import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('Instanciação', () => {
    it('deve ser definido', () => {
      expect(appController).toBeDefined();
    });

    it('deve ter o AppService injetado', () => {
      expect(appService).toBeDefined();
    });
  });

  describe('getHello()', () => {
    it('deve retornar "OK" do AppService', () => {
      const result = appController.getHello();

      expect(result).toBe('OK');
    });

    it('deve chamar o método appService.getHello()', () => {
      const spy = jest.spyOn(appService, 'getHello');

      appController.getHello();

      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('deve retornar o mesmo valor que appService.getHello()', () => {
      const expectedValue = 'OK';
      jest.spyOn(appService, 'getHello').mockReturnValue(expectedValue);

      const result = appController.getHello();

      expect(result).toBe(expectedValue);
    });
  });

  describe('Integração com AppService', () => {
    it('deve tratar erros do AppService adequadamente', () => {
      const errorMessage = 'Service error';
      jest.spyOn(appService, 'getHello').mockImplementation(() => {
        throw new Error(errorMessage);
      });

      expect(() => appController.getHello()).toThrow(errorMessage);
    });

    it('deve funcionar com AppService mockado', async () => {
      const mockAppService = {
        getHello: jest.fn().mockReturnValue('Mocked Response'),
      };

      const moduleWithMock: TestingModule = await Test.createTestingModule({
        controllers: [AppController],
        providers: [
          {
            provide: AppService,
            useValue: mockAppService,
          },
        ],
      }).compile();

      const controllerWithMock = moduleWithMock.get<AppController>(AppController);

      const result = controllerWithMock.getHello();

      expect(result).toBe('Mocked Response');
      expect(mockAppService.getHello).toHaveBeenCalled();
    });
  });
});
