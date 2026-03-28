import { Injectable } from '@nestjs/common';
import { parsePhoneNumber, PhoneNumberParseOptions } from 'awesome-phonenumber';

@Injectable()
export class ApplicationUtility {
  validatePhoneNumber(phoneNumber: string, options?: PhoneNumberParseOptions) {
    return parsePhoneNumber(phoneNumber, options);
  }
}
