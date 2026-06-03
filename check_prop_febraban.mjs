import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

// Ver se 211823442 existe na Febraban
const [f1] = await conn.execute(
  "SELECT id, proposta, linha, situacao, operador, empresa, prazo, troco, financiado FROM febraban WHERE proposta = '211823442'"
);
console.log('Febraban 211823442:', f1);

// Ver se 210647770 existe na Febraban
const [f2] = await conn.execute(
  "SELECT id, proposta, linha, situacao, operador, empresa, prazo, troco, financiado FROM febraban WHERE proposta = '210647770'"
);
console.log('Febraban 210647770:', f2);

// Ver o contrato 211823442
const [c1] = await conn.execute(
  "SELECT id, numeroProposta, taxaMensalJuros, linhaCredito, prazoMeses, valorSolicitado, chaveJOperador FROM contratos WHERE numeroProposta = '211823442'"
);
console.log('Contrato PDF 211823442:', c1);

await conn.end();
