import { Usecase } from '@broker/types';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { RequestContextService } from '@shared/context/requestContext.service';

export interface StaffMeResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  department?: string;
  specialization?: string;
  licenseNumber?: string;
  createdAt: string;
  isActive: boolean;
}

@Injectable()
export class GetMeUsecase extends Usecase<StaffMeResult> {
  constructor(
    private readonly staffRepository: StaffRepository,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(_entityManager: EntityManager): Promise<StaffMeResult> {
    const staffId = this.requestContextService.getUserId();

    const staff = await this.staffRepository.findOne({
      where: { id: staffId },
      relations: ['role', 'department'],
    });

    if (!staff) throw new UnauthorizedException('Staff not found');

    return {
      id: staff.id,
      firstName: staff.firstName,
      lastName: staff.lastName,
      email: staff.email,
      phone: staff.phoneNumber,
      role: staff.role?.alias ?? '',
      department: staff.department?.name,
      specialization: staff.specialization ?? undefined,
      licenseNumber: staff.licenseNumber ?? undefined,
      createdAt: staff.createdAt.toISOString(),
      isActive: staff.isActive,
    };
  }
}
