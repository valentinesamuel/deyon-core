import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Custom validator constraint for strong password validation
 * Requirements:
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 special character
 * - At least 1 number
 * - Minimum 12 characters length
 */
@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: string): boolean {
    if (!password || typeof password !== 'string') {
      return false;
    }

    // Check minimum length
    if (password.length < 12) {
      return false;
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      return false;
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      return false;
    }

    // Check for at least one number
    if (!/\d/.test(password)) {
      return false;
    }

    // Check for at least one special character
    // Special characters include: !@#$%^&*()_+-=[]{}|;:'",.<>?/`~
    if (!/[!@#$%^&*()_+\-=[\]{}|;:'",.<>?/`~\\]/.test(password)) {
      return false;
    }

    return true;
  }

  defaultMessage(): string {
    return 'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 special character, 1 number, and be at least 12 characters long';
  }
}

/**
 * Decorator for validating strong passwords
 * @param validationOptions - Optional validation options
 */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsStrongPasswordConstraint,
    });
  };
}
