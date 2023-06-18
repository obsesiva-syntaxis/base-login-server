import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginUserDTO, RegisterUserDTO, VerifyUserDTO } from './dto';


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

  @Post('verify-user')
  verifyUser(@Body() verifyUserInput: VerifyUserDTO ) {
    return this.authService.verifyUser(verifyUserInput);
  }
}
