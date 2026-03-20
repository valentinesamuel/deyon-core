import { Controller, Get, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiInternalServerErrorResponse, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@shared/decorators/isPublic.decorator';
import { SkipAbortCheck } from '@shared/decorators/skipAbortCheck.decorator';

@Controller('health')
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor() {}

  @Get('/')
  @HttpCode(HttpStatus.OK)
  @Public()
  @SkipAbortCheck()
  @ApiOperation({ operationId: 'checkHealth', summary: 'Check health of the service' })
  @ApiResponse({ status: 201, description: 'The record has been successfully created.' })
  @ApiInternalServerErrorResponse()
  check() {
    throw new Error('My first Sentry error!');
    this.logger.log('Checking health of the service...');
    return {
      message: 'Service is up and running',
    };
  }
}
