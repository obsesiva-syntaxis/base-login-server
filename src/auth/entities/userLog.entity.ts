import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';
const moment = require('moment-timezone');


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

    @Column('text',{ array: true, default: ['user'] })
    roles: string[];

    @Column({ type: 'timestamptz', default: moment().tz("America/Santiago").format() })
    logged_at: Date;
}