import {
  EntityManager,
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';

export type FindResourceOptions<T> = {
  where: FindOptionsWhere<T> | FindOptionsWhere<T>[];
  select?: FindOptionsSelect<T>;
  relations?: FindOptionsRelations<T>;
};

export abstract class BaseRepository<T> extends Repository<T> {
  private repo(entityManager?: EntityManager): Repository<T> {
    return entityManager ? entityManager.getRepository(this.target) : this;
  }

  async findOneOrFailIfNotExists(
    options: FindResourceOptions<T>,
    entityManager?: EntityManager,
  ): Promise<T> {
    const entity = await this.repo(entityManager).findOne(options);

    if (!entity) {
      throw new NotFoundException('Resource not found');
    }

    return entity;
  }

  async findOneOrFailIfExists(options: FindResourceOptions<T>, entityManager?: EntityManager) {
    const exist = await this.repo(entityManager).existsBy(options.where);

    if (exist) {
      throw new ConflictException('Resource already exists');
    }

    return this.repo(entityManager).findOne(options);
  }
}
