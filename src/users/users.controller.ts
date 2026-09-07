import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDTO, QueryUsersDTO } from './dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { ValidRoles } from '../auth/interfaces/valid-roles';

import { Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@Auth(ValidRoles.admin, ValidRoles.superUser)
@Throttle({ default: { limit: 60, ttl: 60000 } })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({
    summary:
      'List users filtered by email, fullname, active, roles or created_at (paginated)',
  })
  @ApiResponse({ status: 200, description: 'Returns filtered paginated users' })
  @ApiResponse({
    status: 400,
    description:
      'At least one filter parameter is required (email, fullname, active, roles, createdAtFrom, createdAtTo)',
  })
  findAll(@Query() query: QueryUsersDTO) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'Returns the user' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user fields' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or email conflict' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDTO) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete user and remove active sessions' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }
}
