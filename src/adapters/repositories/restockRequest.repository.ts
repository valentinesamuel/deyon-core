import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { RestockRequest } from '@modules/core/entities/restockRequest.entity';

@Injectable()
export class RestockRequestRepository extends BaseRepository<RestockRequest> {
  constructor(@InjectRepository(RestockRequest) private readonly repo: Repository<RestockRequest>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createRequest(data: Partial<RestockRequest>, em?: EntityManager): Promise<RestockRequest> {
    const repo = em ? em.getRepository(RestockRequest) : this;
    const request = repo.create(data);
    return repo.save(request);
  }
}
