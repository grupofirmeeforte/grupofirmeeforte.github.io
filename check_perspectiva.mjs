import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

// Ver o contrato PDF da proposta 210647770
const [c] = await conn.execute(
  "SELECT numeroProposta, taxaMensalJuros, linhaCredito, prazoMeses, valorSolicitado FROM contratos WHERE numeroProposta = '210647770'"
);
console.log('Contrato PDF 210647770:', c);

// Ver o agente J9661460
const [ag] = await conn.execute("SELECT chaveJ, situacao FROM agentes WHERE chaveJ = 'J9661460'");
console.log('Agente J9661460:', ag);

// Simular cálculo
if (c.length > 0 && ag.length > 0) {
  const contrato = c[0];
  const agente = ag[0];
  const jurosRaw = parseFloat(String(contrato.taxaMensalJuros ?? 0));
  const jurosNorm = jurosRaw > 1 ? jurosRaw / 100 : jurosRaw;
  const prazo = contrato.prazoMeses;
  const valorLiquido = parseFloat(String(contrato.valorSolicitado ?? 0));
  const produto = contrato.linhaCredito ?? '';
  
  // Extrair nível do agente
  const sit = agente.situacao ?? '';
  const m = sit.match(/(\d{1,2})/);
  const num = m ? parseInt(m[1]) : 3;
  const ativoCol = `ativo${String(num).padStart(2, '0')}`;
  
  console.log(`\nDados do cálculo:`);
  console.log(`  Produto: ${produto}`);
  console.log(`  Juros raw: ${jurosRaw} → normalizado: ${jurosNorm}`);
  console.log(`  Prazo: ${prazo} meses`);
  console.log(`  Valor Líquido: R$${valorLiquido}`);
  console.log(`  Ativo: ${ativoCol}`);
  
  // Buscar na tabela de comissões
  const [tabs] = await conn.execute(
    `SELECT id, convenio, txJurosDe, txJurosAte, mesesDe, mesesAte, ${ativoCol} as percentual 
     FROM tabelasComissao 
     WHERE ? >= CAST(txJurosDe AS DECIMAL(10,6)) AND ? <= CAST(txJurosAte AS DECIMAL(10,6))
     AND ? >= mesesDe AND ? <= mesesAte`,
    [jurosNorm, jurosNorm, prazo, prazo]
  );
  console.log(`\nLinhas da tabela de comissões que batem (juros=${jurosNorm}, prazo=${prazo}):`);
  console.log(JSON.stringify(tabs, null, 2));
  
  if (tabs.length > 0) {
    const pct = parseFloat(String(tabs[0].percentual ?? 0));
    const comissao = +(valorLiquido * pct / 100).toFixed(2);
    console.log(`\n✅ Comissão calculada: R$${valorLiquido} × ${pct}% = R$${comissao}`);
  }
}

await conn.end();
