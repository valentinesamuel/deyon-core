import { mock } from 'vitest-mock-extended';
import { HmoProviderService } from './hmoProvider.service';
import { HmoProviderRepository } from '@adapters/repositories/hmoProvider.repository';

describe('HmoProviderService', () => {
  let service: HmoProviderService;
  const mockRepo = mock<HmoProviderRepository>();

  beforeEach(() => {
    service = new HmoProviderService(mockRepo);
  });

  it('should create an hmo provider via repository', async () => {
    const dto = { name: 'Test HMO', code: 'TEST01' } as any;
    const created = { id: 'uuid-1', ...dto };
    mockRepo.createHmoProvider.mockResolvedValue(created as any);

    const result = await service.createHmoProvider(dto);

    expect(mockRepo.createHmoProvider).toHaveBeenCalledWith(dto, undefined);
    expect(result).toEqual(created);
  });

  it('should get hmo provider by criteria via repository', async () => {
    const options = { where: { code: 'TEST01' } };
    const found = { id: 'uuid-1', code: 'TEST01' };
    mockRepo.findOneOrFailIfNotExists.mockResolvedValue(found as any);

    const result = await service.getHmoProviderByData(options);

    expect(mockRepo.findOneOrFailIfNotExists).toHaveBeenCalledWith(options, undefined);
    expect(result).toEqual(found);
  });

  it('should update hmo provider via repository', async () => {
    const updated = { id: 'uuid-1', name: 'Updated HMO' };
    mockRepo.updateHmoProvider.mockResolvedValue(updated as any);

    const result = await service.updateHmoProvider('uuid-1', { name: 'Updated HMO' });

    expect(mockRepo.updateHmoProvider).toHaveBeenCalledWith(
      'uuid-1',
      { name: 'Updated HMO' },
      undefined,
    );
    expect(result).toEqual(updated);
  });
});
