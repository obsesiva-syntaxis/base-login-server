import { IsOptional, IsPositive, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDTO {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsPositive()
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;
}
