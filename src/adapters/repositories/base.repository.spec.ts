import { ConflictException, NotFoundException } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { mock } from 'vitest-mock-extended';
import { EntityManager, Repository } from 'typeorm';

class StubEntity {
  id: string = '';
  name: string = '';
}

class StubRepository extends BaseRepository<StubEntity> {}

describe('BaseRepository', () => {
  let repo: StubRepository;
  const mockEntityManager = mock<EntityManager>();
  const mockSubRepo = mock<Repository<StubEntity>>();

  beforeEach(() => {
    repo = Object.create(StubRepository.prototype) as StubRepository;
    vi.spyOn(repo, 'findOne').mockResolvedValue(null as any);
    vi.spyOn(repo, 'existsBy').mockResolvedValue(false);
    vi.spyOn(repo, 'update').mockResolvedValue({} as any);
    (repo as any).target = StubEntity;
  });

  describe('findOneOrFailIfNotExists', () => {
    it('should return entity when found', async () => {
      const entity = { id: '1', name: 'Test' };
      vi.spyOn(repo, 'findOne').mockResolvedValue(entity as any);

      const result = await repo.findOneOrFailIfNotExists({ where: { id: '1' } });

      expect(result).toEqual(entity);
    });

    it('should throw NotFoundException when entity is not found', async () => {
      vi.spyOn(repo, 'findOne').mockResolvedValue(null as any);

      await expect(repo.findOneOrFailIfNotExists({ where: { id: '1' } })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should use entityManager repo when em is provided', async () => {
      const entity = { id: '1', name: 'Test' };
      mockEntityManager.getRepository.mockReturnValue(mockSubRepo as any);
      mockSubRepo.findOne.mockResolvedValue(entity as any);

      const result = await repo.findOneOrFailIfNotExists({ where: { id: '1' } }, mockEntityManager);

      expect(mockEntityManager.getRepository).toHaveBeenCalledWith(StubEntity);
      expect(result).toEqual(entity);
    });
  });

  describe('findOneOrFailIfExists', () => {
    it('should return null when entity does not exist', async () => {
      vi.spyOn(repo, 'existsBy').mockResolvedValue(false);
      vi.spyOn(repo, 'findOne').mockResolvedValue(null as any);

      const result = await repo.findOneOrFailIfExists({ where: { id: '1' } });

      expect(result).toBeNull();
    });

    it('should throw ConflictException when entity already exists', async () => {
      vi.spyOn(repo, 'existsBy').mockResolvedValue(true);

      await expect(repo.findOneOrFailIfExists({ where: { id: '1' } })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('updateExistingRecord', () => {
    it('should update and return the updated entity', async () => {
      const entity = { id: '1', name: 'Updated' };
      vi.spyOn(repo, 'existsBy').mockResolvedValue(true);
      vi.spyOn(repo, 'update').mockResolvedValue({} as any);
      vi.spyOn(repo, 'findOne').mockResolvedValue(entity as any);

      const result = await repo.updateExistingRecord({ id: '1' }, { name: 'Updated' });

      expect(repo.update).toHaveBeenCalledWith({ id: '1' }, { name: 'Updated' });
      expect(result).toEqual(entity);
    });

    it('should throw NotFoundException when entity does not exist', async () => {
      vi.spyOn(repo, 'existsBy').mockResolvedValue(false);

      await expect(repo.updateExistingRecord({ id: '1' }, { name: 'Updated' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should use entityManager repo when em is provided', async () => {
      const entity = { id: '1', name: 'Updated' };
      mockEntityManager.getRepository.mockReturnValue(mockSubRepo as any);
      mockSubRepo.existsBy.mockResolvedValue(true);
      mockSubRepo.update.mockResolvedValue({} as any);
      mockSubRepo.findOne.mockResolvedValue(entity as any);

      const result = await repo.updateExistingRecord(
        { id: '1' },
        { name: 'Updated' },
        mockEntityManager,
      );

      expect(mockEntityManager.getRepository).toHaveBeenCalledWith(StubEntity);
      expect(result).toEqual(entity);
    });
  });
});
