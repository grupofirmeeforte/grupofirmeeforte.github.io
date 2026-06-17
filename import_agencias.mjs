import mysql from 'mysql2/promise';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

let XLSX;
try {
  XLSX = require('xlsx');
} catch {
  XLSX = require(`${__dirname}/node_modules/xlsx/lib/xlsx.js`);
}

const wb = XLSX.readFile('/home/ubuntu/upload/agenciasbb.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

// Pular header, pegar prefixo (col 0) e nome (col 1)
const agencias = [];
for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  if (!row[0]) continue;
  const prefixo = parseInt(row[0]);
  const nome = String(row[1] || '').replace(/'/g, "''");
  if (!isNaN(prefixo) && nome) {
    agencias.push([prefixo, nome]);
  }
}

console.log(`Total de agências: ${agencias.length}`);

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Inserir em lotes de 500
const batchSize = 500;
let inserted = 0;
for (let i = 0; i < agencias.length; i += batchSize) {
  const batch = agencias.slice(i, i + batchSize);
  const values = batch.map(([p, n]) => `(${p}, '${n}', 0)`).join(',');
  await conn.execute(`INSERT IGNORE INTO agencias_bb (prefixo, nome, createdAt) VALUES ${values}`);
  inserted += batch.length;
  console.log(`Inseridas: ${inserted}/${agencias.length}`);
}

console.log('Importação concluída!');
await conn.end();
