const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const TOTAL = 500000;
const BATCH = 1000;
const PASSWORD = 'Seed1234';
const DEFAULT_ROLE = '{user}';

async function main() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: +(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const hashedPassword = await bcrypt.hash(PASSWORD, 10);

  console.log(`Inserting ${TOTAL} users in batches of ${BATCH}...`);

  for (let i = 1; i <= TOTAL; i += BATCH) {
    const values = [];
    const params = [];
    let idx = 1;

    for (let j = i; j < i + BATCH && j <= TOTAL; j++) {
      const email = `user${j}@seed.com`;
      params.push(email, hashedPassword, `User ${j}`, DEFAULT_ROLE);
      values.push(`($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3})`);
      idx += 4;
    }

    // eslint-disable-next-line no-await-in-loop
    await pool.query(
      `INSERT INTO "user" (email, password, fullname, roles) VALUES ${values.join(', ')} ON CONFLICT (email) DO NOTHING`,
      params,
    );

    const done = Math.min(i + BATCH - 1, TOTAL);
    if (done % 10000 === 0 || i === 1) {
      console.log(`Progress: ${done} / ${TOTAL}`);
    }
  }

  await pool.end();
  console.log('Done! 500000 users inserted.');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
