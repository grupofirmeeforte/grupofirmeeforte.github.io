import { createConnection } from 'mysql2/promise';
const conn = await createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(
  "SELECT numeroProposta, dataContrato, DATE_FORMAT(createdAt,'%d/%m/%Y') as criado, chaveJOperador FROM contratos ORDER BY createdAt DESC LIMIT 5"
);
console.log('Últimos 5:', JSON.stringify(rows, null, 2));
const [r2] = await conn.execute(
  "SELECT numeroProposta, dataContrato, DATE_FORMAT(createdAt,'%d/%m/%Y') as criado FROM contratos WHERE numeroProposta='211823442'"
);
console.log('211823442:', JSON.stringify(r2, null, 2));
const [r3] = await conn.execute(
  "SELECT COUNT(*) as sem_data FROM contratos WHERE dataContrato IS NULL OR dataContrato = ''"
);
console.log('Sem dataContrato:', JSON.stringify(r3, null, 2));
await conn.end();
