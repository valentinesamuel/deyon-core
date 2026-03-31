import { mock } from 'vitest-mock-extended';
import { HmoProvidersController } from './hmoProviders.controller';
import { Broker } from '@broker/broker';
import { FetchAllHmoProvidersUsecase } from '../usecases/fetchAllHmoProviders.uc';
import { FetchHmoProviderByCodeUsecase } from '../usecases/fetchHmoProviderByCode.uc';
import { CreateHmoProviderUsecase } from '../usecases/createHmoProvider.uc';
import { UpdateHmoProviderUsecase } from '../usecases/updateHmoProvider.uc';

describe('HmoProvidersController', () => {
  let controller: HmoProvidersController;
  const mockBroker = mock<Broker>();
  const mockFetchAll = mock<FetchAllHmoProvidersUsecase>();
  const mockFetchByCode = mock<FetchHmoProviderByCodeUsecase>();
  const mockCreate = mock<CreateHmoProviderUsecase>();
  const mockUpdate = mock<UpdateHmoProviderUsecase>();

  beforeEach(() => {
    controller = new HmoProvidersController(
      mockBroker,
      mockFetchAll,
      mockFetchByCode,
      mockCreate,
      mockUpdate,
    );
    mockBroker.runUsecases.mockResolvedValue({} as any);
  });

  it('should call broker.runUsecases with fetchAll usecase and query', async () => {
    const query = { limit: 10 } as any;
    await controller.getAllHmoProviders(query);
    expect(mockBroker.runUsecases).toHaveBeenCalledWith([mockFetchAll], { query });
  });

  it('should call broker.runUsecases with fetchByCode usecase and code', async () => {
    await controller.getHmoProviderByCode('HMO01');
    expect(mockBroker.runUsecases).toHaveBeenCalledWith([mockFetchByCode], { code: 'HMO01' });
  });

  it('should call broker.runUsecases with create usecase and dto', async () => {
    const dto = { name: 'New HMO', code: 'HMO02' } as any;
    await controller.createHmoProvider(dto);
    expect(mockBroker.runUsecases).toHaveBeenCalledWith([mockCreate], dto);
  });

  it('should call broker.runUsecases with update usecase, id and dto', async () => {
    const dto = { name: 'Updated HMO' } as any;
    await controller.updateHmoProvider('uuid-123', dto);
    expect(mockBroker.runUsecases).toHaveBeenCalledWith([mockUpdate], {
      id: 'uuid-123',
      dto,
    });
  });
});
