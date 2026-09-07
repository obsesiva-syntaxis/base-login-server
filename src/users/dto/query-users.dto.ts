import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  Validate,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiHideProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ValidRoles } from '../../auth/interfaces/valid-roles';
import { AtLeastOneConstraint } from '../../common/validators/at-least-one.validator';
import { PaginationDTO } from './pagination.dto';

const FILTER_PROPERTIES: string[] = [
  'email',
  'fullname',
  'active',
  'roles',
  'createdAtFrom',
  'createdAtTo',
];

export class QueryUsersDTO extends PaginationDTO {
  @Validate(AtLeastOneConstraint, FILTER_PROPERTIES)
  @ApiHideProperty()
  private readonly _filters?: never;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fullname?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  active?: boolean;

  @ApiPropertyOptional({
    enum: ValidRoles,
    description:
      'Filter by role (user, admin or super-user). Read-only, unlike role assignment.',
  })
  @IsOptional()
  @IsEnum(ValidRoles)
  roles?: ValidRoles;

  @ApiPropertyOptional({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Filter users created from this ISO date (inclusive)',
  })
  @IsOptional()
  @IsDateString()
  createdAtFrom?: string;

  @ApiPropertyOptional({
    example: '2024-12-31T23:59:59.999Z',
    description: 'Filter users created until this ISO date (inclusive)',
  })
  @IsOptional()
  @IsDateString()
  createdAtTo?: string;
}
