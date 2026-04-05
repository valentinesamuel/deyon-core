import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConflictRule } from './conflictRule.entity';
import { ConflictRulesController } from './conflictRules.controller';
import { ConflictRulesService } from './conflictRules.service';

@Module({
  imports: [TypeOrmModule.forFeature([ConflictRule])],
  controllers: [ConflictRulesController],
  providers: [ConflictRulesService],
})
export class ConflictRulesModule {}
