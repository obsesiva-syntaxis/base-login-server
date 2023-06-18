import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
const moment = require('moment-timezone');


@Entity('UserLog')
export class UserLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('text', { unique: true })
    email: string;

    @Column('text')
    token: string;

    @Column('text',{
        array: true,
        default: ['user']
    })
    roles: string[];

    @Column({ type: 'timestamptz', default: moment().tz("America/Santiago").format() })
    logged_at: Date;
}