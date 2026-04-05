import { Controller, Get } from '@nestjs/common';
import { Public } from '@shared/decorators/isPublic.decorator';
import { ConflictRulesService } from './conflictRules.service';

@Controller('conflict-rules')
export class ConflictRulesController {
  constructor(private readonly conflictRulesService: ConflictRulesService) {}

  @Get()
  @Public()
  findAll() {
    return this.conflictRulesService.findAll();
  }
}
