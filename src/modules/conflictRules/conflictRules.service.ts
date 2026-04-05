import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictRule } from './conflictRule.entity';

@Injectable()
export class ConflictRulesService {
  constructor(
    @InjectRepository(ConflictRule) private readonly conflictRuleRepo: Repository<ConflictRule>,
  ) {}

  findAll() {
    return this.conflictRuleRepo.find();
  }
}
