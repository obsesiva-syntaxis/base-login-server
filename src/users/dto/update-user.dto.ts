import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  IsBoolean,
  IsArray,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AssignableRole, ValidRoles } from '../../auth/interfaces/valid-roles';

const ASSIGNABLE_ROLES: AssignableRole[] = [ValidRoles.user, ValidRoles.admin];

export class UpdateUserDTO {
  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsEmail()
  @IsOptional()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  @MinLength(1)
  fullname?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({
    example: ['user', 'admin'],
    description:
      'Roles assignable via API. "super-user" cannot be assigned through the API.',
  })
  @IsArray()
  @IsIn(ASSIGNABLE_ROLES, {
    each: true,
    message: 'Only "user" and "admin" roles can be assigned through the API',
  })
  @IsOptional()
  roles?: AssignableRole[];
}
