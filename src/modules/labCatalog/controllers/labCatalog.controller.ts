import { Broker } from '@broker/broker';
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { GetAllQueryDto } from '@shared/queryEngine';
import { FetchAllTestCatalogsUsecase } from '../usecases/fetchAllTestCatalogs.uc';
import { CreateTestCatalogUsecase } from '../usecases/createTestCatalog.uc';
import { FetchTestCatalogByIdUsecase } from '../usecases/fetchTestCatalogById.uc';
import { UpdateTestCatalogUsecase } from '../usecases/updateTestCatalog.uc';
import { FetchReferenceRangesByTestUsecase } from '../usecases/fetchReferenceRangesByTest.uc';
import { CreateReferenceRangeUsecase } from '../usecases/createReferenceRange.uc';
import { UpdateReferenceRangeUsecase } from '../usecases/updateReferenceRange.uc';
import { DeleteReferenceRangeUsecase } from '../usecases/deleteReferenceRange.uc';
import { CreateTestCatalogDto } from '../dto/createTestCatalog.dto';
import { UpdateTestCatalogDto } from '../dto/updateTestCatalog.dto';
import { CreateReferenceRangeDto } from '../dto/createReferenceRange.dto';
import { UpdateReferenceRangeDto } from '../dto/updateReferenceRange.dto';

@Controller('lab')
export class LabCatalogController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly fetchAllTestCatalogsUsecase: FetchAllTestCatalogsUsecase,
    private readonly createTestCatalogUsecase: CreateTestCatalogUsecase,
    private readonly fetchTestCatalogByIdUsecase: FetchTestCatalogByIdUsecase,
    private readonly updateTestCatalogUsecase: UpdateTestCatalogUsecase,
    private readonly fetchReferenceRangesByTestUsecase: FetchReferenceRangesByTestUsecase,
    private readonly createReferenceRangeUsecase: CreateReferenceRangeUsecase,
    private readonly updateReferenceRangeUsecase: UpdateReferenceRangeUsecase,
    private readonly deleteReferenceRangeUsecase: DeleteReferenceRangeUsecase,
  ) {}

  @Get('catalog')
  @RequirePermissions([PERMISSION.TEST_CATALOG.LIST])
  async getAllTestCatalogs(@Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchAllTestCatalogsUsecase], { query });
  }

  @Post('catalog')
  @RequirePermissions([PERMISSION.TEST_CATALOG.CREATE])
  async createTestCatalog(@Body() dto: CreateTestCatalogDto) {
    return this.serviceBroker.runUsecases([this.createTestCatalogUsecase], dto);
  }

  @Get('catalog/:id')
  @RequirePermissions([PERMISSION.TEST_CATALOG.READ])
  async getTestCatalogById(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.fetchTestCatalogByIdUsecase], { id });
  }

  @Put('catalog/:id')
  @RequirePermissions([PERMISSION.TEST_CATALOG.UPDATE])
  async updateTestCatalog(@Param('id') id: string, @Body() dto: UpdateTestCatalogDto) {
    return this.serviceBroker.runUsecases([this.updateTestCatalogUsecase], { id, dto });
  }

  @Get('catalog/:id/reference-ranges')
  @RequirePermissions([PERMISSION.REFERENCE_RANGE.LIST])
  async getReferenceRangesByTest(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.fetchReferenceRangesByTestUsecase], {
      testId: id,
    });
  }

  @Post('catalog/:id/reference-ranges')
  @RequirePermissions([PERMISSION.REFERENCE_RANGE.CREATE])
  async createReferenceRange(@Param('id') id: string, @Body() dto: CreateReferenceRangeDto) {
    return this.serviceBroker.runUsecases([this.createReferenceRangeUsecase], {
      testId: id,
      dto,
    });
  }

  @Put('catalog/:id/reference-ranges/:rangeId')
  @RequirePermissions([PERMISSION.REFERENCE_RANGE.UPDATE])
  async updateReferenceRange(
    @Param('id') id: string,
    @Param('rangeId') rangeId: string,
    @Body() dto: UpdateReferenceRangeDto,
  ) {
    return this.serviceBroker.runUsecases([this.updateReferenceRangeUsecase], {
      testId: id,
      rangeId,
      dto,
    });
  }

  @Delete('catalog/:id/reference-ranges/:rangeId')
  @RequirePermissions([PERMISSION.REFERENCE_RANGE.DELETE])
  async deleteReferenceRange(@Param('id') id: string, @Param('rangeId') rangeId: string) {
    return this.serviceBroker.runUsecases([this.deleteReferenceRangeUsecase], {
      testId: id,
      rangeId,
    });
  }
}
