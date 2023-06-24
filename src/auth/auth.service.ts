import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { LoginUserDTO, RegisterUserDTO, VerifyUserDTO } from './dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { AuthResponse } from './types/auth-response.type';
import { UserLog } from './entities/userLog.entity';
import { UUID } from 'crypto';

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
    
    const userLogged = this.userLogRepository.create({
      userId: user.id,
      token: token,
      email: user.email,
      roles: user.roles
    });
    user.password = undefined;
    
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

  async logout( id: string ) {
    try {
      const user = await this.userRepository.findOneBy({ id });
      const userLogged = await this.userLogRepository.findOneBy({ userId: user.id });
      await this.userLogRepository.remove(userLogged);
      return true;
    } catch (err) {
      this.handleDatabaseErrors(err);
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


