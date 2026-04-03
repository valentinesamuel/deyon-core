import { mock } from 'vitest-mock-extended';
import { EntityManager } from 'typeorm';
import { UpdateHmoProviderUsecase } from './updateHmoProvider.uc';
import { HmoProviderService } from '../service/hmoProvider.service';
import { UpdateHmoProviderDto } from '../dto/updateHmoProvider.dto';

describe('UpdateHmoProviderUsecase', () => {
  let usecase: UpdateHmoProviderUsecase;
  const mockHmoProviderService = mock<HmoProviderService>();
  const mockEntityManager = mock<EntityManager>();

  beforeEach(() => {
    usecase = new UpdateHmoProviderUsecase(mockHmoProviderService);
  });

  it('should have requiresTransaction set to true', () => {
    expect(usecase.config.requiresTransaction).toBe(true);
  });

  it('should call hmoProviderService.updateHmoProvider and return mapped result', async () => {
    const now = new Date();
    const updatedProvider: UpdateHmoProviderDto = {
      name: 'Updated HMO',
      code: 'HMO01',
      contactPhone: '+2348012345678',
      contactEmail: 'contact@hmo.com',
      address: '123 Health Street',
      defaultCopay: 5000,
      defaultCopayPercentage: 10,
      isActive: true,
      portalUrl: 'https://hmo.com/portal',
      claimsEmail: 'claims@hmo.com',
      retractionEmail: 'retraction@hmo.com',
    };

    mockHmoProviderService.updateHmoProvider.mockResolvedValue(updatedProvider as any);

    const result = await usecase.execute(mockEntityManager, {
      id: 'uuid-123',
      dto: { name: 'Updated HMO' },
    });

    expect(mockHmoProviderService.updateHmoProvider).toHaveBeenCalledWith(
      'uuid-123',
      expect.objectContaining({ name: 'Updated HMO' }),
      mockEntityManager,
    );
    expect(result).toEqual({
      hmoProvider: {
        id: 'uuid-123',
        createdAt: now,
        updatedAt: now,
        name: 'Updated HMO',
        code: 'HMO01',
        contactPhone: '+2348012345678',
        contactEmail: 'contact@hmo.com',
        address: '123 Health Street',
        defaultCopay: '5000',
        defaultCopayPercentage: 10,
        isActive: true,
        portalUrl: 'https://hmo.com/portal',
        claimsEmail: 'claims@hmo.com',
        retractionEmail: 'retraction@hmo.com',
      },
    });
  });
});
