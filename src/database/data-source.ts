import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

config();

const dbRejectUnauthorized =
  process.env.DB_SSL_REJECT_UNAUTHORIZED ??
  (process.env.NODE_ENV === 'production' ? 'true' : 'false');

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: dbRejectUnauthorized === 'true',
  },
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
});
