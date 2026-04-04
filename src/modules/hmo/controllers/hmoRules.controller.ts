import { Broker } from '@broker/broker';
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { GetAllQueryDto } from '@shared/queryEngine';
import { FetchAllHmoRulesUsecase } from '../usecases/hmoRules/fetchAllHmoRules.uc';
import { CreateHmoRuleUsecase } from '../usecases/hmoRules/createHmoRule.uc';
import { FetchHmoRuleByIdUsecase } from '../usecases/hmoRules/fetchHmoRuleById.uc';
import { UpdateHmoRuleUsecase } from '../usecases/hmoRules/updateHmoRule.uc';
import { DeleteHmoRuleUsecase } from '../usecases/hmoRules/deleteHmoRule.uc';
import { CreateHmoRulesDto } from '../dto/hmoRules/createHmoRules.dto';
import { UpdateHmoRulesDto } from '../dto/hmoRules/updateHmoRules.dto';

@Controller('hmo/providers/:providerId/rules')
export class HmoRulesController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly fetchAllHmoRulesUsecase: FetchAllHmoRulesUsecase,
    private readonly createHmoRuleUsecase: CreateHmoRuleUsecase,
    private readonly fetchHmoRuleByIdUsecase: FetchHmoRuleByIdUsecase,
    private readonly updateHmoRuleUsecase: UpdateHmoRuleUsecase,
    private readonly deleteHmoRuleUsecase: DeleteHmoRuleUsecase,
  ) {}

  @Get('')
  @RequirePermissions([PERMISSION.HMO_RULE.LIST])
  async getAllHmoRules(@Param('providerId') providerId: string, @Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchAllHmoRulesUsecase], { query, providerId });
  }

  @Post('')
  @RequirePermissions([PERMISSION.HMO_RULE.CREATE])
  async createHmoRule(@Param('providerId') providerId: string, @Body() dto: CreateHmoRulesDto) {
    return this.serviceBroker.runUsecases([this.createHmoRuleUsecase], { providerId, dto });
  }

  @Get(':id')
  @RequirePermissions([PERMISSION.HMO_RULE.READ])
  async getHmoRuleById(@Param('providerId') providerId: string, @Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.fetchHmoRuleByIdUsecase], { id, providerId });
  }

  @Put(':id')
  @RequirePermissions([PERMISSION.HMO_RULE.UPDATE])
  async updateHmoRule(
    @Param('providerId') providerId: string,
    @Param('id') id: string,
    @Body() dto: UpdateHmoRulesDto,
  ) {
    return this.serviceBroker.runUsecases([this.updateHmoRuleUsecase], { id, providerId, dto });
  }

  @Delete(':id')
  @RequirePermissions([PERMISSION.HMO_RULE.DELETE])
  async deleteHmoRule(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.deleteHmoRuleUsecase], { ruleId: id });
  }
}
