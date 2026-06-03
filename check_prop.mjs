import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

// Verificar se a proposta existe na tabela consignados
const [rows] = await conn.execute(
  "SELECT nrOperacao, juros, produto, parcela, valorLiquido FROM consignados WHERE nrOperacao = '210647770' LIMIT 5"
);
console.log('consignados:', JSON.stringify(rows, null, 2));

// Verificar na febraban
const [frows] = await conn.execute(
  "SELECT proposta, linha, prazo, troco, financiado, situacao FROM febraban WHERE proposta = '210647770' LIMIT 5"
);
console.log('febraban:', JSON.stringify(frows, null, 2));

// Ver o que está na tabela de comissões para linha 2882
const [trows] = await conn.execute(
  "SELECT * FROM tabelas_comissao WHERE convenio LIKE '%CONSORCIO%' OR convenio LIKE '%CONS%' LIMIT 10"
);
console.log('tabelasComissao CONS:', JSON.stringify(trows, null, 2));

await conn.end();
