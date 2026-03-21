import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonalAccessToken } from '@modules/core/entities/personalAccessToken.entity';
import { PersonalAccessTokenRepository } from '@adapters/repositories/personalAccessToken.repository';
import { PatController } from './controllers/pat.controller';
import { GeneratePatUsecase } from './usecases/generatePat.uc';
import { ListPatsUsecase } from './usecases/listPats.uc';
import { RevokePatUsecase } from './usecases/revokePat.uc';
import { AuthModule } from '@modules/auth/auth.module';
import { Broker } from '@broker/broker';

@Module({
  imports: [TypeOrmModule.forFeature([PersonalAccessToken]), AuthModule],
  controllers: [PatController],
  providers: [
    PersonalAccessTokenRepository,
    GeneratePatUsecase,
    ListPatsUsecase,
    RevokePatUsecase,
    Broker,
  ],
  exports: [PersonalAccessTokenRepository],
})
export class PatModule {}
