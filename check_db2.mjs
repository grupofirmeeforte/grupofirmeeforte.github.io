import mysql from 'mysql2/promise';
const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Buscar todos os consignados do J9660864 em 05/2026
const [consig] = await conn.execute(
  'SELECT id, chaveJ, mes, empresa, convenio, descricaoProduto, juros, parcela, valorLiquido, rbm, percPago, totalComissao FROM consignados WHERE chaveJ = "J9660864" AND mes = "05/2026" ORDER BY id'
);
console.log('=== TODOS CONSIGNADOS J9660864 05/2026 ===');
console.table(consig);

// Buscar linhas NÃO CONSIGNADO na tabela de comissões BMF
const [linhas] = await conn.execute(
  'SELECT id, empresa, convenio, mesesDe, mesesAte, txJurosDe, txJurosAte, ativo01, ativo02, ativo03 FROM tabelasComissao WHERE empresa = "BMF" AND convenio = "NÃO CONSIGNADO"'
);
console.log('=== LINHAS NAO CONSIGNADO BMF ===');
console.table(linhas);

await conn.end();
