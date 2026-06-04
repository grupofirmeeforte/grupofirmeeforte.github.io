import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute('SELECT data FROM feriados WHERE ano = 2026');
const feriadosSet = new Set(rows.map(f => f.data));
console.log('Total feriados 2026:', feriadosSet.size);

// Feriados de junho
const junho = [...feriadosSet].filter(d => d.includes('/06/'));
console.log('Feriados junho:', junho);

const isUtil = (d) => {
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return false;
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yyyy = d.getFullYear();
  const key = dd+'/'+mm+'/'+yyyy;
  return !feriadosSet.has(key);
};

// Testar todos os meses de 2026
for (let mes = 1; mes <= 12; mes++) {
  const ultimo = new Date(2026, mes, 0);
  let cur = new Date(ultimo);
  while (!isUtil(cur)) cur.setDate(cur.getDate()-1);
  const ultStr = cur.toLocaleDateString('pt-BR');
  cur.setDate(cur.getDate()-1);
  while (!isUtil(cur)) cur.setDate(cur.getDate()-1);
  const penStr = cur.toLocaleDateString('pt-BR');
  console.log('Mes', String(mes).padStart(2,'0'), '- ultimo util:', ultStr, '- penultimo util:', penStr);
}

await conn.end();
