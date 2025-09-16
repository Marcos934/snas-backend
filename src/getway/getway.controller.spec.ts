import { Test, TestingModule } from '@nestjs/testing';
import { GetwayController } from './getway.controller';

describe('GetwayController', () => {
  let controller: GetwayController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GetwayController],
    }).compile();

    controller = module.get<GetwayController>(GetwayController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
