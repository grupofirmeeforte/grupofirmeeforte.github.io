import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

// Ver os últimos contratos inseridos
const [rows] = await conn.execute(
  "SELECT id, numeroProposta, taxaMensalJuros, linhaCredito, prazoMeses, valorSolicitado, chaveJOperador, createdAt FROM contratos ORDER BY createdAt DESC LIMIT 10"
);
console.log('Últimos 10 contratos:');
for (const r of rows) {
  console.log(JSON.stringify(r));
}

// Buscar especificamente pela proposta 210647770 com LIKE
const [like] = await conn.execute(
  "SELECT id, numeroProposta FROM contratos WHERE numeroProposta LIKE '%210647770%'"
);
console.log('\nBusca LIKE 210647770:', like);

// Ver todos os numeroProposta disponíveis
const [todos] = await conn.execute(
  "SELECT DISTINCT numeroProposta FROM contratos ORDER BY createdAt DESC LIMIT 20"
);
console.log('\nNúmeros de proposta disponíveis:', todos.map(r => r.numeroProposta));

await conn.end();
