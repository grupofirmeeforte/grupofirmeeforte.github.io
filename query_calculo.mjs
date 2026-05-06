import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'localhost',
  user: process.env.DATABASE_URL?.split('://')[1]?.split(':')[0],
  password: process.env.DATABASE_URL?.split(':')[2]?.split('@')[0],
  database: process.env.DATABASE_URL?.split('/').pop()?.split('?')[0],
});

const [rows] = await connection.execute('SELECT * FROM calculos WHERE chaveJ = ? ORDER BY id DESC LIMIT 1', ['TEST001']);
console.log('Resultado:', JSON.stringify(rows, null, 2));
await connection.end();
