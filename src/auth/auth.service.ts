import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { LoginUserDTO, RegisterUserDTO, VerifyUserDTO } from './dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { AuthResponse } from './types/auth-response.type';
import { UserLog } from './entities/userLog.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserLog)
    private readonly userLogRepository: Repository<UserLog>,
    private readonly jwtService: JwtService
  ){}

  async login({ email, password }: LoginUserDTO): Promise<AuthResponse>{
    const user = await this.userRepository.findOneBy({ email });
    if (!bcrypt.compareSync(password, user.password ) ) throw new BadRequestException('Email/Password Do not match.');
    const token = this.getJwtToken( user.id );
    user.password = undefined;

    const userLogged = this.userLogRepository.create({
      token: token,
      email: user.email,
      roles: user.roles
    });

    await this.userLogRepository.save( userLogged );

    return {
      token,
      user
    };
  }

  async register( registerInput: RegisterUserDTO): Promise<User> {
    try {
      const newUser = this.userRepository.create({
        ...registerInput,
        password: bcrypt.hashSync( registerInput.password, 10),
      });
      return await this.userRepository.save( newUser );
    } catch (err) {
      this.handleDatabaseErrors(err.code);
    }
  }

  async verifyUser( { token, userId }: VerifyUserDTO ): Promise<Boolean> {
    const user = this.userRepository.findBy({ id: userId });
    console.log(user);
    return true;
  }

  private getJwtToken( userId: string ) {
    return this.jwtService.sign({ id: userId });
  }

  private handleDatabaseErrors(code: any): never{
    if(code === '23505') throw new BadRequestException('email already exist in database.');
    throw new InternalServerErrorException('internal server error please contact with developers');
  }
}


