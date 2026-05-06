import mysql from '/home/ubuntu/grupo-firme-forte/node_modules/mysql2/promise.js';
import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Limpar tabela
await connection.execute("DELETE FROM tabelasComissao");
console.log("Tabela limpa.");

// Carregar Excel com xlsx
const buf = readFileSync('/home/ubuntu/upload/GrupoForteV.7.0.xlsx');
const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
const ws = wb.Sheets['Tabela Comissão'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

function fmt(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (s === '' || s === 'null' || s === 'undefined') return null;
  // Tentar formatar como número
  const n = parseFloat(s);
  if (!isNaN(n) && s.match(/^[\d.eE+-]+$/)) {
    // Formatar com até 6 casas decimais, removendo zeros à direita
    return n.toFixed(6).replace(/\.?0+$/, '');
  }
  return s;
}

// Dados começam na linha 4 (índice 4 = linha 5 do Excel)
let inserted = 0;
let currentEmpresa = null;
let currentFaixas = [null, null, null, null, null];

for (let i = 4; i < data.length; i++) {
  const row = data[i];
  if (!row || row.length === 0) continue;

  const empresa = fmt(row[0]);
  const convenio = fmt(row[8]);

  // Atualizar empresa e faixas quando aparecerem
  if (empresa) {
    currentEmpresa = empresa;
    currentFaixas = [fmt(row[1]), fmt(row[2]), fmt(row[3]), fmt(row[4]), fmt(row[5])];
  }

  // Só inserir se tiver convênio
  if (!convenio) continue;

  const faixas = empresa ? currentFaixas : currentFaixas;

  const params = [
    currentEmpresa,
    faixas[0], faixas[1], faixas[2], faixas[3], faixas[4],
    fmt(row[6]),  // tabelaCalculo
    fmt(row[7]),  // referencia
    convenio,
    fmt(row[9]),  // txJurosDe
    fmt(row[11]), // txJurosAte
    fmt(row[12]), // valorMinimo
    fmt(row[13]), // mesesDe
    fmt(row[15]), // mesesAte
    fmt(row[16]), // ativo01
    fmt(row[17]), // ativo02
    fmt(row[18]), // ativo03
    fmt(row[19]), // ativo04
    fmt(row[20]), // ativo05
    fmt(row[21]), // ativo06
    fmt(row[22]), // ativo07
    fmt(row[23]), // ativo08
  ];

  await connection.execute(`
    INSERT INTO tabelasComissao 
    (empresa, faixa1, faixa2, faixa3, faixa4, faixa5, tabelaCalculo, referencia,
     convenio, txJurosDe, txJurosAte, valorMinimo, mesesDe, mesesAte,
     ativo01, ativo02, ativo03, ativo04, ativo05, ativo06, ativo07, ativo08)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `, params);
  inserted++;
}

console.log(`✅ ${inserted} registros inseridos com sucesso!`);
await connection.end();
