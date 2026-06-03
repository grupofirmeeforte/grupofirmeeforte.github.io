import mysql from 'mysql2/promise';
const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Simular o cálculo para J9660864, NÃO CONSIGNADO, juros 4.75, parcela 60, VL 2235.84
const empresa = 'BMF';
const descricao = 'NÃO CONSIGNADO';
const jurosRaw = 4.75;
const jurosNum = jurosRaw > 1 ? jurosRaw / 100 : jurosRaw; // 0.0475
const parcelaNum = 60;

console.log(`jurosRaw=${jurosRaw} → jurosNum=${jurosNum}`);

const [linhas] = await conn.execute(
  'SELECT id, convenio, mesesDe, mesesAte, txJurosDe, txJurosAte, ativo01, ativo02, ativo03 FROM tabelasComissao WHERE empresa = ?',
  [empresa]
);

// Filtrar por convênio
const filtradas = linhas.filter(t => {
  const conv = (t.convenio || '').toUpperCase().trim();
  const desc = descricao.toUpperCase().trim();
  return conv === desc || desc.includes(conv) || conv.includes(desc);
});
console.log(`Linhas filtradas por convênio: ${filtradas.length}`);

// Filtrar por parcela
const comParcela = filtradas.filter(t => {
  const mDe = t.mesesDe ? parseInt(t.mesesDe) : 0;
  const mAte = t.mesesAte ? parseInt(t.mesesAte) : 9999;
  return parcelaNum >= mDe && parcelaNum <= mAte;
});
console.log(`Linhas filtradas por parcela (${parcelaNum}): ${comParcela.length}`);

// Filtrar por juros
const parseJuros = (v) => {
  if (!v) return 0;
  const s = v.trim().toLowerCase();
  if (s === 'acima') return 9999;
  return parseFloat(s.replace(',', '.')) || 0;
};

const comJuros = comParcela.filter(t => {
  const jDe = parseJuros(t.txJurosDe);
  const jAte = parseJuros(t.txJurosAte);
  console.log(`  id=${t.id} jDe=${jDe} jAte=${jAte} → ${jurosNum} >= ${jDe} && ${jurosNum} <= ${jAte} = ${jurosNum >= jDe && jurosNum <= jAte}`);
  return jurosNum >= jDe && jurosNum <= jAte;
});

console.log(`Linhas filtradas por juros: ${comJuros.length}`);
if (comJuros.length > 0) {
  const match = comJuros[0];
  console.log(`Match: id=${match.id} ativo03=${match.ativo03}`);
  const perc = parseFloat(match.ativo03);
  const vl = 2235.84;
  console.log(`Comissão = ${vl} × ${perc} = ${(vl * perc).toFixed(2)}`);
}

await conn.end();
