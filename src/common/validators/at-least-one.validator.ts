import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'atLeastOne', async: false })
export class AtLeastOneConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const object = args.object as Record<string, unknown>;
    const properties = args.constraints as string[];
    return properties.some(
      (property) => object[property] !== undefined && object[property] !== null,
    );
  }

  defaultMessage(args: ValidationArguments): string {
    const properties = (args.constraints as string[]).join(', ');
    return `At least one of the following parameters is required: ${properties}`;
  }
}
