import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import fs from 'fs';

const sql = fs.readFileSync('./drizzle/0008_cultured_gorgon.sql', 'utf-8');
const statements = sql.split('-->').map(s => s.trim()).filter(s => s);

const pool = await mysql.createPool({
  connectionLimit: 1,
  host: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0],
  user: process.env.DATABASE_URL?.split('://')[1]?.split(':')[0],
  password: process.env.DATABASE_URL?.split(':')[2]?.split('@')[0],
  database: process.env.DATABASE_URL?.split('/').pop(),
});

for (const stmt of statements) {
  try {
    await pool.execute(stmt);
    console.log('✓', stmt);
  } catch (e) {
    console.error('✗', stmt, e.message);
  }
}

await pool.end();
