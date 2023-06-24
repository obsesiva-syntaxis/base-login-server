import { Controller, Post, Body, ParseUUIDPipe, Get, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginUserDTO, RegisterUserDTO, VerifyUserDTO } from './dto';
import { UUID } from 'crypto';


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('register')
  register(@Body() registerInput: RegisterUserDTO) {
    return this.authService.register(registerInput);
  }

  @Post('login')
  login(@Body() loginInput: LoginUserDTO) {
    return this.authService.login(loginInput);
  }

  @Get('logout/:id')
  logout(@Param('id', ParseUUIDPipe) id: string) {
    return this.authService.logout(id);
  } 

  @Post('verify-user')
  verifyUser(@Body() verifyUserInput: VerifyUserDTO ) {
    return this.authService.verifyUser(verifyUserInput);
  }
}
