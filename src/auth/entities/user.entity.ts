import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
const moment = require('moment-timezone');

@Entity('user')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('text', { unique: true })
    email: string;

    @Column('text')
    password: string;

    @Column('text')
    fullname: string;

    @Column('bool', { default: true })
    active: boolean;

    @Column('text',{
        array: true,
        default: ['user']
    })
    roles: string[];

    @Column({ type: 'timestamptz', default: moment().tz("America/Santiago").format() })
    created_at: Date;

    @Column({ type: 'timestamptz', default: null })
    modified_at: Date;

    @Column({ type: 'timestamptz', default: null })
    deleted_at: Date;
}