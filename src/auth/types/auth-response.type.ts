import { User } from '../entities/user.entity';

export interface AuthResponse {
  token: string;
  user: User;
}
