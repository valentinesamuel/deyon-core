import { plainToInstance } from 'class-transformer';
import { CreateHmoProviderDto } from './createHmoProvider.dto';
import { validate } from 'class-validator';

describe('CreateHmoProviderDto', () => {
  const validPayload: CreateHmoProviderDto = {
    name: 'Reliance Health',
    code: 'Axa2324',
    contactPhone: '+2348618472694',
    contactEmail: 'test@test.com',
    claimsEmail: 'test@test.com',
    retractionEmail: 'test@test.com',
    address: 'Makoko',
    portalUrl: 'http://portal.com',
    defaultCopay: 12000,
    isActive: true,
    relationshipManagerPhone: "+2348618472694'",
  };

  it('should pass with valid data', async () => {
    const dto = plainToInstance(CreateHmoProviderDto, validPayload);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
