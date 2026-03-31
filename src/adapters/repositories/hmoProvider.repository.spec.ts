import { mock } from 'vitest-mock-extended';
import { HmoProviderRepository } from './hmoProvider.repository';
import { HmoProvider } from '@modules/core/entities/hmoProvider.entity';
import { EntityManager, Repository } from 'typeorm';

describe('HmoProviderRepository', () => {
  let repository: HmoProviderRepository;
  const mockEntityManager = mock<EntityManager>();
  const mockSubRepo = mock<Repository<HmoProvider>>();

  beforeEach(() => {
    repository = Object.create(HmoProviderRepository.prototype) as HmoProviderRepository;
    (repository as any).manager = mock<EntityManager>();
    vi.spyOn(repository, 'create').mockReturnValue({} as any);
    vi.spyOn(repository, 'save').mockResolvedValue({} as any);
  });

  describe('createHmoProvider', () => {
    it('should create and save using the repository itself when no em provided', async () => {
      const data = { name: 'Test HMO', code: 'HMO01' };
      const created = { id: 'uuid-1', ...data };
      vi.spyOn(repository, 'create').mockReturnValue(created as any);
      vi.spyOn(repository, 'save').mockResolvedValue(created as any);

      const result = await repository.createHmoProvider(data);

      expect(repository.create).toHaveBeenCalledWith(data);
      expect(repository.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });

    it('should use entityManager repository when em is provided', async () => {
      const data = { name: 'Test HMO', code: 'HMO01' };
      const created = { id: 'uuid-1', ...data };
      mockEntityManager.getRepository.mockReturnValue(mockSubRepo as any);
      mockSubRepo.create.mockReturnValue(created as any);
      mockSubRepo.save.mockResolvedValue(created as any);

      const result = await repository.createHmoProvider(data, mockEntityManager);

      expect(mockEntityManager.getRepository).toHaveBeenCalledWith(HmoProvider);
      expect(mockSubRepo.create).toHaveBeenCalledWith(data);
      expect(result).toEqual(created);
    });
  });

  describe('updateHmoProvider', () => {
    it('should call updateExistingRecord with id criteria and data', async () => {
      const data = { name: 'Updated HMO' };
      const updated = { id: 'uuid-1', ...data };
      vi.spyOn(repository, 'updateExistingRecord').mockResolvedValue(updated as any);

      const result = await repository.updateHmoProvider('uuid-1', data);

      expect(repository.updateExistingRecord).toHaveBeenCalledWith(
        { id: 'uuid-1' },
        data,
        expect.anything(),
      );
      expect(result).toEqual(updated);
    });

    it('should pass entityManager to updateExistingRecord when em is provided', async () => {
      const data = { name: 'Updated HMO' };
      vi.spyOn(repository, 'updateExistingRecord').mockResolvedValue({} as any);

      await repository.updateHmoProvider('uuid-1', data, mockEntityManager);

      expect(repository.updateExistingRecord).toHaveBeenCalledWith(
        { id: 'uuid-1' },
        data,
        mockEntityManager,
      );
    });
  });
});
