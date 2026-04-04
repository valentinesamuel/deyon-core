import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Broker } from '@broker/broker';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { GetAllQueryDto } from '@shared/queryEngine';
import { CreateClaimDto } from '../dto/createClaim.dto';
import { UpdateClaimDto } from '../dto/updateClaim.dto';
import { DenyClaimDto } from '../dto/denyClaim.dto';
import { WithdrawClaimDto } from '../dto/withdrawClaim.dto';
import { RetractClaimDto } from '../dto/retractClaim.dto';
import { ResubmitClaimDto } from '../dto/resubmitClaim.dto';
import { ApproveClaimDto } from '../dto/approveClaim.dto';
import { CreateClaimUsecase } from '../usecases/createClaim.uc';
import { FetchAllClaimsUsecase } from '../usecases/fetchAllClaims.uc';
import { FetchClaimByIdUsecase } from '../usecases/fetchClaimById.uc';
import { UpdateClaimUsecase } from '../usecases/updateClaim.uc';
import { SubmitClaimUsecase } from '../usecases/submitClaim.uc';
import { UploadClaimDocumentUsecase } from '../usecases/uploadClaimDocument.uc';
import { ApproveClaimUsecase } from '../usecases/approveClaim.uc';
import { DenyClaimUsecase } from '../usecases/denyClaim.uc';
import { MarkClaimPaidUsecase } from '../usecases/markClaimPaid.uc';
import { WithdrawClaimUsecase } from '../usecases/withdrawClaim.uc';
import { RetractClaimUsecase } from '../usecases/retractClaim.uc';
import { ResubmitClaimUsecase } from '../usecases/resubmitClaim.uc';
import { FetchClaimVersionsUsecase } from '../usecases/fetchClaimVersions.uc';

@ApiTags('Claims')
@Controller('claims')
export class ClaimsController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly createClaimUsecase: CreateClaimUsecase,
    private readonly fetchAllClaimsUsecase: FetchAllClaimsUsecase,
    private readonly fetchClaimByIdUsecase: FetchClaimByIdUsecase,
    private readonly updateClaimUsecase: UpdateClaimUsecase,
    private readonly submitClaimUsecase: SubmitClaimUsecase,
    private readonly uploadClaimDocumentUsecase: UploadClaimDocumentUsecase,
    private readonly approveClaimUsecase: ApproveClaimUsecase,
    private readonly denyClaimUsecase: DenyClaimUsecase,
    private readonly markClaimPaidUsecase: MarkClaimPaidUsecase,
    private readonly withdrawClaimUsecase: WithdrawClaimUsecase,
    private readonly retractClaimUsecase: RetractClaimUsecase,
    private readonly resubmitClaimUsecase: ResubmitClaimUsecase,
    private readonly fetchClaimVersionsUsecase: FetchClaimVersionsUsecase,
  ) {}

  @Post()
  @RequirePermissions([PERMISSION.CLAIM.CREATE])
  createClaim(@Body() dto: CreateClaimDto) {
    return this.serviceBroker.runUsecases([this.createClaimUsecase], dto);
  }

  @Get()
  @RequirePermissions([PERMISSION.CLAIM.LIST])
  getAllClaims(@Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchAllClaimsUsecase], { query });
  }

  @Get(':id')
  @RequirePermissions([PERMISSION.CLAIM.READ])
  getClaimById(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.fetchClaimByIdUsecase], { id });
  }

  @Patch(':id')
  @RequirePermissions([PERMISSION.CLAIM.UPDATE])
  updateClaim(@Param('id') id: string, @Body() dto: UpdateClaimDto) {
    return this.serviceBroker.runUsecases([this.updateClaimUsecase], { id, ...dto });
  }

  @Patch(':id/submit')
  @RequirePermissions([PERMISSION.CLAIM.SUBMIT])
  submitClaim(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.submitClaimUsecase], { id });
  }

  @Post(':id/documents')
  @RequirePermissions([PERMISSION.CLAIM.UPLOAD_DOCUMENT])
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: { originalname: string; buffer: Buffer; mimetype: string; size: number },
  ) {
    return this.serviceBroker.runUsecases([this.uploadClaimDocumentUsecase], {
      id,
      file: {
        originalname: file.originalname,
        buffer: file.buffer,
        mimetype: file.mimetype,
        size: file.size,
      },
    });
  }

  @Patch(':id/approve')
  @RequirePermissions([PERMISSION.CLAIM.APPROVE])
  approveClaim(@Param('id') id: string, @Body() dto: ApproveClaimDto) {
    return this.serviceBroker.runUsecases([this.approveClaimUsecase], { id, ...dto });
  }

  @Patch(':id/deny')
  @RequirePermissions([PERMISSION.CLAIM.DENY])
  denyClaim(@Param('id') id: string, @Body() dto: DenyClaimDto) {
    return this.serviceBroker.runUsecases([this.denyClaimUsecase], { id, ...dto });
  }

  @Patch(':id/mark-paid')
  @RequirePermissions([PERMISSION.CLAIM.APPROVE])
  markClaimPaid(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.markClaimPaidUsecase], { id });
  }

  @Patch(':id/withdraw')
  @RequirePermissions([PERMISSION.CLAIM.WITHDRAW])
  withdrawClaim(@Param('id') id: string, @Body() dto: WithdrawClaimDto) {
    return this.serviceBroker.runUsecases([this.withdrawClaimUsecase], { id, ...dto });
  }

  @Patch(':id/retract')
  @RequirePermissions([PERMISSION.CLAIM.RETRACT])
  retractClaim(@Param('id') id: string, @Body() dto: RetractClaimDto) {
    return this.serviceBroker.runUsecases([this.retractClaimUsecase], { id, ...dto });
  }

  @Patch(':id/resubmit')
  @RequirePermissions([PERMISSION.CLAIM.RESUBMIT])
  resubmitClaim(@Param('id') id: string, @Body() dto: ResubmitClaimDto) {
    return this.serviceBroker.runUsecases([this.resubmitClaimUsecase], { id, ...dto });
  }

  @Get(':id/versions')
  @RequirePermissions([PERMISSION.CLAIM.READ])
  getClaimVersions(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.fetchClaimVersionsUsecase], { id });
  }
}
