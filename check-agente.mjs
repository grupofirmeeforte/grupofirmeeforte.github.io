import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await connection.execute(`SELECT * FROM agentes WHERE chaveJ = 'J1234567' LIMIT 1`);
console.log('Agente encontrado:', rows);
connection.end();
