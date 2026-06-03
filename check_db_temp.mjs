import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await conn.execute(
  'SELECT id, empresa, convenio, mesesDe, mesesAte, txJurosDe, txJurosAte, ativo01, ativo02, ativo03, ativo04 FROM tabelasComissao WHERE empresa = "BMF" ORDER BY id'
);
console.log('=== TABELA COMISSAO BMF ===');
console.table(rows);

const [agente] = await conn.execute('SELECT chaveJ, situacao, nivel, empresa FROM agentes WHERE chaveJ = "J9660864"');
console.log('=== AGENTE ===');
console.table(agente);

const [consig] = await conn.execute('SELECT id, chaveJ, mes, empresa, convenio, descricaoProduto, juros, parcela, valorLiquido, rbm, percPago, totalComissao FROM consignados WHERE chaveJ = "J9660864" AND mes = "05/2026" LIMIT 5');
console.log('=== CONSIGNADO ===');
console.table(consig);

await conn.end();
