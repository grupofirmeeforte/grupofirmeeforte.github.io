import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
const conn = await mysql.createConnection(url);

console.log('=== TOTAIS POR MÊS ===');
const [rows1] = await conn.execute(`
  SELECT mes, COUNT(*) as qtd, 
    ROUND(SUM(valorLiquido), 2) as total_vl, 
    ROUND(SUM(totalComissao), 2) as total_comissao
  FROM consignados 
  GROUP BY mes 
  ORDER BY mes DESC
`);
console.table(rows1);

console.log('\n=== AMOSTRA DE REGISTROS 05/2026 (primeiros 10) ===');
const [rows2] = await conn.execute(`
  SELECT nrOperacao, empresa, mes, valorLiquido, rbm, percPago, totalComissao
  FROM consignados 
  WHERE mes = '05/2026'
  ORDER BY totalComissao DESC
  LIMIT 10
`);
console.table(rows2);

console.log('\n=== REGISTROS COM COMISSÃO MUITO ALTA (>5000) ===');
const [rows3] = await conn.execute(`
  SELECT nrOperacao, empresa, mes, valorLiquido, rbm, percPago, totalComissao, convenio
  FROM consignados 
  WHERE totalComissao > 5000
  ORDER BY totalComissao DESC
  LIMIT 20
`);
console.table(rows3);

console.log('\n=== VERIFICAR percPago (valores acima de 1.0 = erro de formato) ===');
const [rows4] = await conn.execute(`
  SELECT COUNT(*) as qtd_percPago_alto, MAX(percPago) as max_percPago, AVG(percPago) as avg_percPago
  FROM consignados 
  WHERE mes = '05/2026' AND percPago > 1.0
`);
console.table(rows4);

const [rows5] = await conn.execute(`
  SELECT COUNT(*) as qtd_total, 
    COUNT(CASE WHEN percPago > 1.0 THEN 1 END) as qtd_percPago_errado,
    COUNT(CASE WHEN percPago BETWEEN 0 AND 1.0 THEN 1 END) as qtd_percPago_ok,
    COUNT(CASE WHEN percPago = 0 THEN 1 END) as qtd_percPago_zero
  FROM consignados 
  WHERE mes = '05/2026'
`);
console.table(rows5);

await conn.end();
