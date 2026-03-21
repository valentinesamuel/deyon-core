import {
  EntityManager,
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';

export type FindResourceOptions<T> = {
  where: FindOptionsWhere<T> | FindOptionsWhere<T>[];
  select?: FindOptionsSelect<T>;
  relations?: FindOptionsRelations<T>;
};

export abstract class BaseRepository<T extends ObjectLiteral> extends Repository<T> {
  async findOneOrFailIfNotExists(options: FindResourceOptions<T>, em?: EntityManager): Promise<T> {
    const repo = em ? em.getRepository(this.target) : this;
    const entity = await repo.findOne(options);

    if (!entity) {
      throw new NotFoundException('Resource not found');
    }

    return entity;
  }

  async findOneOrFailIfExists(options: FindResourceOptions<T>, em?: EntityManager) {
    const repo = em ? em.getRepository(this.target) : this;
    const exist = await repo.existsBy(options.where);

    if (exist) {
      throw new ConflictException('Resource already exists');
    }

    return repo.findOne(options);
  }
}
