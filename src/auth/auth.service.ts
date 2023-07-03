import { BadRequestException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { LoginUserDTO, RegisterUserDTO } from './dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { AuthResponse } from './types/auth-response.type';
import { UserLog } from './entities/userLog.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';

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
    if( !user ) throw new UnauthorizedException('Email/Password Do not match.');
    if (!bcrypt.compareSync(password, user.password ) ) throw new BadRequestException('Email/Password Do not match.');
    const token = this.getJwtToken({ id: user.id });
    
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
      const userCreated = await this.userRepository.save( newUser );
      userCreated.password = undefined;
      return userCreated;
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

  private getJwtToken( payload: JwtPayload ) {
    const token = this.jwtService.sign( payload );
    return token;

  }

  async validateUser( id:string ): Promise<User> {
    const user = await this.userRepository.findOneById( id );
    if ( !user.active ) throw new UnauthorizedException(`User is inactive, talk with an admin.`);
    delete user.password;
    return user;  
  }

  async checkAuthStatus( user: User ){
    return {
      ...user,
      token: this.getJwtToken({ id: user.id })
    };
  }

  private handleDatabaseErrors(code: any): never{
    if(code === '23505') throw new BadRequestException('email already exist in database.');
    throw new InternalServerErrorException('internal server error please contact with developers');
  }
}


