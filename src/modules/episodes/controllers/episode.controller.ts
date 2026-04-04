import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Broker } from '@broker/broker';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { GetAllQueryDto } from '@shared/queryEngine';
import { OpenEpisodeDto } from '../dto/openEpisode.dto';
import { UpdateEpisodeDto } from '../dto/updateEpisode.dto';
import { AddDiagnosisDto } from '../dto/addDiagnosis.dto';
import { OpenEpisodeUsecase } from '../usecases/openEpisode.uc';
import { FetchAllEpisodesUsecase } from '../usecases/fetchAllEpisodes.uc';
import { FetchEpisodeByIdUsecase } from '../usecases/fetchEpisodeById.uc';
import { UpdateEpisodeUsecase } from '../usecases/updateEpisode.uc';
import { CloseEpisodeUsecase } from '../usecases/closeEpisode.uc';
import { LockEpisodeUsecase } from '../usecases/lockEpisode.uc';
import { UnlockEpisodeUsecase } from '../usecases/unlockEpisode.uc';
import { AddDiagnosisUsecase } from '../usecases/addDiagnosis.uc';
import { RemoveDiagnosisUsecase } from '../usecases/removeDiagnosis.uc';

@ApiTags('Episodes')
@Controller('episodes')
export class EpisodeController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly openEpisodeUsecase: OpenEpisodeUsecase,
    private readonly fetchAllEpisodesUsecase: FetchAllEpisodesUsecase,
    private readonly fetchEpisodeByIdUsecase: FetchEpisodeByIdUsecase,
    private readonly updateEpisodeUsecase: UpdateEpisodeUsecase,
    private readonly closeEpisodeUsecase: CloseEpisodeUsecase,
    private readonly lockEpisodeUsecase: LockEpisodeUsecase,
    private readonly unlockEpisodeUsecase: UnlockEpisodeUsecase,
    private readonly addDiagnosisUsecase: AddDiagnosisUsecase,
    private readonly removeDiagnosisUsecase: RemoveDiagnosisUsecase,
  ) {}

  @Post()
  @RequirePermissions([PERMISSION.EPISODE.CREATE])
  openEpisode(@Body() dto: OpenEpisodeDto) {
    return this.serviceBroker.runUsecases([this.openEpisodeUsecase], dto);
  }

  @Get()
  @RequirePermissions([PERMISSION.EPISODE.LIST])
  getAllEpisodes(@Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchAllEpisodesUsecase], { query });
  }

  @Get(':id')
  @RequirePermissions([PERMISSION.EPISODE.READ])
  getEpisodeById(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.fetchEpisodeByIdUsecase], { id });
  }

  @Patch(':id')
  @RequirePermissions([PERMISSION.EPISODE.UPDATE])
  updateEpisode(@Param('id') id: string, @Body() dto: UpdateEpisodeDto) {
    return this.serviceBroker.runUsecases([this.updateEpisodeUsecase], { id, dto });
  }

  @Patch(':id/close')
  @RequirePermissions([PERMISSION.EPISODE.CLOSE])
  closeEpisode(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.closeEpisodeUsecase], { id });
  }

  @Patch(':id/lock')
  @RequirePermissions([PERMISSION.EPISODE.LOCK])
  lockEpisode(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.lockEpisodeUsecase], { id });
  }

  @Patch(':id/unlock')
  @RequirePermissions([PERMISSION.EPISODE.UNLOCK])
  unlockEpisode(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.unlockEpisodeUsecase], { id });
  }

  @Post(':id/diagnoses')
  @RequirePermissions([PERMISSION.EPISODE.DIAGNOSE])
  addDiagnosis(@Param('id') id: string, @Body() dto: AddDiagnosisDto) {
    return this.serviceBroker.runUsecases([this.addDiagnosisUsecase], { id, dto });
  }

  @Delete(':id/diagnoses/:diagId')
  @RequirePermissions([PERMISSION.EPISODE.DIAGNOSE])
  removeDiagnosis(@Param('id') id: string, @Param('diagId') diagId: string) {
    return this.serviceBroker.runUsecases([this.removeDiagnosisUsecase], { id, diagId });
  }
}
