import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await connection.execute(`DESCRIBE users`);
console.log(rows);
connection.end();
