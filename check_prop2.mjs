import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

// Ver a tabela de comissões (nome real)
const [trows] = await conn.execute("SELECT * FROM tabelasComissao LIMIT 5");
console.log('tabelasComissao sample:', JSON.stringify(trows[0], null, 2));

// Ver convênios distintos
const [convs] = await conn.execute("SELECT DISTINCT convenio FROM tabelasComissao");
console.log('convênios:', convs.map(r => r.convenio));

// Ver o agente J9661460 para saber o ativo
const [ag] = await conn.execute("SELECT chaveJ, situacao, nome FROM agentes WHERE chaveJ = 'J9661460'");
console.log('agente J9661460:', ag);

await conn.end();
