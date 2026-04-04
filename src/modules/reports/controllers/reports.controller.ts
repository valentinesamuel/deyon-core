import { Controller, Get, Query } from '@nestjs/common';
import { ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { ReportsService } from '../service/reports.service';

class ReportDateRangeDto {
  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('financial')
  @RequirePermissions([PERMISSION.REPORT.FINANCIAL])
  getFinancialReport(@Query() query: ReportDateRangeDto) {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    return this.reportsService.getFinancialReport({ from, to });
  }

  @Get('consultations')
  @RequirePermissions([PERMISSION.REPORT.CONSULTATIONS])
  getConsultationsReport(@Query() query: ReportDateRangeDto) {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    return this.reportsService.getConsultationsReport({ from, to });
  }

  @Get('lab')
  @RequirePermissions([PERMISSION.REPORT.LAB])
  getLabReport(@Query() query: ReportDateRangeDto) {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    return this.reportsService.getLabReport({ from, to });
  }

  @Get('pharmacy')
  @RequirePermissions([PERMISSION.REPORT.PHARMACY])
  getPharmacyReport(@Query() query: ReportDateRangeDto) {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    return this.reportsService.getPharmacyReport({ from, to });
  }

  @Get('inventory')
  @RequirePermissions([PERMISSION.REPORT.INVENTORY])
  getInventoryReport() {
    return this.reportsService.getInventoryReport();
  }

  @Get('claims')
  @RequirePermissions([PERMISSION.REPORT.CLAIMS])
  getClaimsReport(@Query() query: ReportDateRangeDto) {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    return this.reportsService.getClaimsReport({ from, to });
  }

  @Get('alerts')
  @RequirePermissions([PERMISSION.REPORT.ALERTS])
  getAlertsReport() {
    return this.reportsService.getAlertsReport();
  }
}
