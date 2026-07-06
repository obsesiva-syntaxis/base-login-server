import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('user_log')
export class UserLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { unique: true })
  userId: string;

  @Column('text', { unique: true })
  email: string;

  @Column('text')
  token: string;

  @Column('text', { array: true, default: ['user'] })
  roles: string[];

  @CreateDateColumn({ type: 'timestamptz' })
  logged_at: Date;
}
