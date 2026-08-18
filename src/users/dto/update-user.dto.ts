import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  IsBoolean,
  IsArray,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ValidRoles } from '../../auth/interfaces/valid-roles';

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

  @ApiPropertyOptional({ example: ['user', 'admin'] })
  @IsArray()
  @IsString({ each: true })
  @IsEnum(ValidRoles, { each: true, message: 'Each role must be a valid role' })
  @IsOptional()
  roles?: string[];
}
