import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

// Ver o agente J9661460
const [ag] = await conn.execute("SELECT chaveJ, situacao FROM agentes WHERE chaveJ = 'J9661460'");
console.log('agente J9661460:', ag);

// Ver linhas da tabela de comissões que contêm o código 2882
const [t2882] = await conn.execute("SELECT id, empresa, codigo, convenio, txJurosDe, txJurosAte, mesesDe, mesesAte, ativo01, ativo02, ativo03, ativo04 FROM tabelasComissao WHERE codigo LIKE '%2882%'");
console.log('tabela para código 2882:', JSON.stringify(t2882, null, 2));

// Ver linhas da tabela de comissões para CONVENIOS BANCO DO BRASIL
const [tbb] = await conn.execute("SELECT id, empresa, codigo, convenio, txJurosDe, txJurosAte, mesesDe, mesesAte, ativo01, ativo02, ativo03, ativo04 FROM tabelasComissao WHERE convenio LIKE '%BANCO%' OR convenio LIKE '%BB%'");
console.log('tabela BANCO DO BRASIL:', JSON.stringify(tbb, null, 2));

await conn.end();
