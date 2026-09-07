import {
  Controller,
  Post,
  Body,
  ParseUUIDPipe,
  Get,
  Param,
  Delete,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginUserDTO, RegisterUserDTO } from './dto';
import { Auth } from './decorators/auth.decorator';
import { GetUser } from './decorators/get-user.decorator';
import { User } from './entities/user.entity';
import { ValidRoles } from './interfaces/valid-roles';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or email already exists',
  })
  register(@Body() registerInput: RegisterUserDTO) {
    return this.authService.register(registerInput);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Returns JWT token and user' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() loginInput: LoginUserDTO) {
    return this.authService.login(loginInput);
  }

  @Delete('logout/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and remove active session' })
  @ApiResponse({ status: 200, description: 'Session ended successfully' })
  @ApiResponse({ status: 403, description: 'Cannot end another user session' })
  @Auth()
  logout(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.authService.logout(id, user);
  }

  @Get('check-status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check authentication status' })
  @Auth()
  checkAuthStatus(@GetUser() user: User) {
    return this.authService.checkAuthStatus(user);
  }

  @Get('private')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Demo endpoint — extract user details from token' })
  @Auth()
  testingPrivateRoute(
    @GetUser() user: User,
    @GetUser('email') userEmail: string,
  ) {
    return {
      ok: true,
      message: 'Hola Mundo Private',
      user,
      userEmail,
    };
  }

  @Get('private2')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Demo endpoint — super-user or admin only' })
  @Auth(ValidRoles.superUser, ValidRoles.admin)
  privateRoute2(@GetUser() user: User) {
    return {
      ok: true,
      user,
    };
  }

  @Get('private3')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Demo endpoint — admin only' })
  @Auth(ValidRoles.admin)
  privateRoute3(@GetUser() user: User) {
    return {
      ok: true,
      user,
    };
  }
}
