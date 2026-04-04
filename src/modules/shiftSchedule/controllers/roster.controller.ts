import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Broker } from '@broker/broker';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { GetAllQueryDto } from '@shared/queryEngine';
import { CreateRosterDto } from '../dto/createRoster.dto';
import { UpdateRosterDto } from '../dto/updateRoster.dto';
import { AddRosterAssignmentDto } from '../dto/addRosterAssignment.dto';
import { CreateRosterUsecase } from '../usecases/createRoster.uc';
import { FetchAllRostersUsecase } from '../usecases/fetchAllRosters.uc';
import { FetchRosterByIdUsecase } from '../usecases/fetchRosterById.uc';
import { UpdateRosterUsecase } from '../usecases/updateRoster.uc';
import { PublishRosterUsecase } from '../usecases/publishRoster.uc';
import { DeleteRosterUsecase } from '../usecases/deleteRoster.uc';
import { AddRosterAssignmentUsecase } from '../usecases/addRosterAssignment.uc';
import { RemoveRosterAssignmentUsecase } from '../usecases/removeRosterAssignment.uc';

@ApiTags('Roster')
@Controller('roster')
export class RosterController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly createRosterUsecase: CreateRosterUsecase,
    private readonly fetchAllRostersUsecase: FetchAllRostersUsecase,
    private readonly fetchRosterByIdUsecase: FetchRosterByIdUsecase,
    private readonly updateRosterUsecase: UpdateRosterUsecase,
    private readonly publishRosterUsecase: PublishRosterUsecase,
    private readonly deleteRosterUsecase: DeleteRosterUsecase,
    private readonly addRosterAssignmentUsecase: AddRosterAssignmentUsecase,
    private readonly removeRosterAssignmentUsecase: RemoveRosterAssignmentUsecase,
  ) {}

  @Post()
  @RequirePermissions([PERMISSION.ROSTER.CREATE])
  createRoster(@Body() dto: CreateRosterDto) {
    return this.serviceBroker.runUsecases([this.createRosterUsecase], dto);
  }

  @Get()
  @RequirePermissions([PERMISSION.ROSTER.LIST])
  getAllRosters(@Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchAllRostersUsecase], { query });
  }

  @Get(':id')
  @RequirePermissions([PERMISSION.ROSTER.READ])
  getRosterById(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.fetchRosterByIdUsecase], { id });
  }

  @Patch(':id')
  @RequirePermissions([PERMISSION.ROSTER.UPDATE])
  updateRoster(@Param('id') id: string, @Body() dto: UpdateRosterDto) {
    return this.serviceBroker.runUsecases([this.updateRosterUsecase], { id, dto });
  }

  @Patch(':id/publish')
  @RequirePermissions([PERMISSION.ROSTER.PUBLISH])
  publishRoster(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.publishRosterUsecase], { id });
  }

  @Delete(':id')
  @RequirePermissions([PERMISSION.ROSTER.DELETE])
  deleteRoster(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.deleteRosterUsecase], { id });
  }

  @Post(':id/assignments')
  @RequirePermissions([PERMISSION.ROSTER.ASSIGN])
  addRosterAssignment(@Param('id') id: string, @Body() dto: AddRosterAssignmentDto) {
    return this.serviceBroker.runUsecases([this.addRosterAssignmentUsecase], { id, dto });
  }

  @Delete(':id/assignments/:assignmentId')
  @RequirePermissions([PERMISSION.ROSTER.ASSIGN])
  removeRosterAssignment(@Param('id') id: string, @Param('assignmentId') assignmentId: string) {
    return this.serviceBroker.runUsecases([this.removeRosterAssignmentUsecase], {
      id,
      assignmentId,
    });
  }
}
